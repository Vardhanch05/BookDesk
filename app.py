import os
import re
from datetime import datetime, timezone
from flask import Flask, render_template, request, jsonify
from dotenv import load_dotenv
from supabase import create_client, Client
from twilio.rest import Client as TwilioClient
from apscheduler.schedulers.background import BackgroundScheduler
import logging

load_dotenv()

app = Flask(__name__)
logging.basicConfig(level=logging.INFO)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY) if SUPABASE_URL and SUPABASE_KEY else None

TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
TWILIO_FROM_NUMBER = os.getenv("TWILIO_FROM_NUMBER")
twilio_client = TwilioClient(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN) if TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN else None

def format_e164(phone: str) -> str:

    cleaned = re.sub(r'[\s\-()]', '', phone)
    if not cleaned.startswith('+'):
        cleaned = '+' + cleaned.lstrip('0')
    return cleaned

def send_twilio_message(to_number: str, body: str):
    if not twilio_client:
        app.logger.warning("Twilio client not initialized. Cannot send message.")
        return
    try:
        message = twilio_client.messages.create(
            body=body,
            from_=TWILIO_FROM_NUMBER,
            to=to_number
        )
        app.logger.info(f"Sent Twilio message SID: {message.sid}")
    except Exception as e:
        app.logger.error(f"Failed to send Twilio message: {str(e)}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add-appointment', methods=['POST'])
def add_appointment():
    try:
        data = request.json
        customer_name = data.get('customer_name')
        phone_number = data.get('phone_number')
        appointment_time_str = data.get('appointment_time')

        if not all([customer_name, phone_number, appointment_time_str]):
            return jsonify({'error': 'Missing required fields'}), 400

        phone_number = format_e164(phone_number)


        if appointment_time_str.endswith('Z'):
            appointment_time_str = appointment_time_str[:-1] + '+00:00'
        
        utc_dt = datetime.fromisoformat(appointment_time_str)
        iso_utc_time = utc_dt.isoformat()
        local_dt = utc_dt.astimezone()

        if supabase:
            response = supabase.table('appointments').insert({
                'customer_name': customer_name,
                'phone_number': phone_number,
                'appointment_time': iso_utc_time,
                'reminder_sent': False
            }).execute()
        

        formatted_time = local_dt.strftime('%b %d, %Y at %I:%M %p')
        body = f"Hi {customer_name}, your appointment is confirmed for {formatted_time}."
        send_twilio_message(phone_number, body)

        return jsonify({'success': True, 'message': 'Appointment booked successfully!'}), 201

    except Exception as e:
        app.logger.error(f"Error adding appointment: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/appointments', methods=['GET'])
def get_appointments():
    try:
        if supabase:
            response = supabase.table('appointments').select('*').order('appointment_time', desc=False).execute()
            return jsonify(response.data), 200
        return jsonify([]), 200
    except Exception as e:
        app.logger.error(f"Error fetching appointments: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def check_reminders():

    app.logger.info("Checking for upcoming appointments to send reminders...")
    try:
        if not supabase:
            return
            
        now_utc = datetime.now(timezone.utc)
        now_plus_1hr = now_utc.timestamp() + 3600
        one_hour_later_iso = datetime.fromtimestamp(now_plus_1hr, timezone.utc).isoformat()
        now_iso = now_utc.isoformat()

        response = supabase.table('appointments') \
            .select('*') \
            .gte('appointment_time', now_iso) \
            .lte('appointment_time', one_hour_later_iso) \
            .eq('reminder_sent', False) \
            .execute()
        
        appointments = response.data
        for appt in appointments:
            body = "Reminder: your appointment is in less than 1 hour!"
            send_twilio_message(appt['phone_number'], body)
            
            supabase.table('appointments').update({'reminder_sent': True}).eq('id', appt['id']).execute()

    except Exception as e:
        app.logger.error(f"Error in background scheduler: {str(e)}")

scheduler = BackgroundScheduler()
scheduler.add_job(func=check_reminders, trigger="interval", minutes=5)
scheduler.start()

if __name__ == '__main__':
    app.run(debug=True, use_reloader=False, port=5000)
