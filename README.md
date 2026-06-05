# Appointment Reminder System

## Overview

This project is an automated appointment reminder system developed as part of the AI Automation Developer Internship practical assessment.

The application allows users to schedule appointments, stores appointment details in a database, sends confirmation SMS messages, and automatically sends reminder notifications before upcoming appointments.

## Features

* Add customer appointments through a web form
* Store appointment data in Supabase PostgreSQL
* Send SMS confirmations using Twilio
* Display appointments in a live dashboard
* Automatically send reminder SMS notifications before appointments
* Background scheduling using APScheduler
* Deployed web application accessible online

## Technology Stack

* Python
* Flask
* Supabase PostgreSQL
* Twilio API
* APScheduler
* HTML, CSS, JavaScript
* Render (Deployment)

## System Workflow

1. User submits customer details and appointment time.
2. Flask receives and validates the request.
3. Appointment information is stored in Supabase.
4. Twilio sends an SMS confirmation to the customer.
5. Dashboard fetches and displays appointments.
6. APScheduler periodically checks upcoming appointments.
7. Reminder SMS messages are sent automatically before scheduled appointments.

## Challenges and Solutions

### APScheduler Duplicate Execution

During development, APScheduler jobs were executing twice because of Flask's development server reloader. This issue was resolved by disabling the reloader using:

use_reloader=False

### Timezone Handling

Appointment times submitted from the browser were converted appropriately before storage to ensure reminders were sent at the correct time.

## Setup Instructions

### Install Dependencies

pip install -r requirements.txt

### Configure Environment Variables

Create a .env file and add:

* SUPABASE_URL
* SUPABASE_KEY
* TWILIO_ACCOUNT_SID
* TWILIO_AUTH_TOKEN
* TWILIO_PHONE_NUMBER

### Run Application

python app.py

## Project Structure

* app.py
* templates/
* static/
* requirements.txt
* README.md

## Deployment

The application is deployed on Render and can be accessed through the deployed URL provided in the submission.

## Author

Vardhan
B.Tech CSE (Data Science)
