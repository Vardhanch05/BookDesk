document.addEventListener('DOMContentLoaded', () => {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.querySelector('.btn-text');
    const loader = document.querySelector('.loader');
    const formMessage = document.getElementById('formMessage');
    const appointmentsList = document.getElementById('appointments-list');
    const queueCount = document.getElementById('queue-count');
    const currentDateEl = document.getElementById('current-date');

    // Display current date
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    currentDateEl.textContent = new Date().toLocaleDateString('en-US', options);

    // Initial fetch
    fetchAppointments();

    // Auto-refresh every 30 seconds
    setInterval(fetchAppointments, 30000);

    // Add appointment using div form and fetch
    submitBtn.addEventListener('click', async () => {
        const customerName = document.getElementById('customerName').value.trim();
        const phoneNumber = document.getElementById('phoneNumber').value.trim();
        const appointmentTimeRaw = document.getElementById('appointmentTime').value;

        if (!customerName || !phoneNumber || !appointmentTimeRaw) {
            showMessage('Please fill in all fields', 'error');
            return;
        }

        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
        submitBtn.disabled = true;

        try {
            // Convert datetime-local to ISO format for Supabase/Flask TIMESTAMPTZ
            const isoTime = new Date(appointmentTimeRaw).toISOString();

            const response = await fetch('/add-appointment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    customer_name: customerName,
                    phone_number: phoneNumber,
                    appointment_time: isoTime
                })
            });

            const data = await response.json();
            
            if (response.ok) {
                showMessage(data.message, 'success');
                // Clear inputs
                document.getElementById('customerName').value = '';
                document.getElementById('phoneNumber').value = '';
                document.getElementById('appointmentTime').value = '';
                // Refresh list
                fetchAppointments();
            } else {
                showMessage(data.error || 'Something went wrong', 'error');
            }
        } catch (error) {
            console.error('Submission error:', error);
            showMessage('Network error occurred', 'error');
        } finally {
            btnText.classList.remove('hidden');
            loader.classList.add('hidden');
            submitBtn.disabled = false;
        }
    });

    async function fetchAppointments() {
        try {
            const response = await fetch('/appointments');
            const appointments = await response.json();
            
            appointmentsList.innerHTML = '';
            
            if (appointments.length === 0) {
                queueCount.textContent = '0 waiting';
                appointmentsList.innerHTML = `
                    <div style="padding: 20px; text-align: center; color: var(--text-light);">
                        No upcoming appointments.
                    </div>
                `;
                return;
            }

            queueCount.textContent = `${appointments.length} waiting`;

            appointments.forEach(appt => {
                const item = document.createElement('div');
                item.className = 'queue-item';

                // Format the date nicely
                const dateObj = new Date(appt.appointment_time);
                const displayDate = dateObj.toLocaleString([], {
                    month: 'short', day: 'numeric',
                    hour: '2-digit', minute: '2-digit'
                });

                // Initials for avatar
                const initials = appt.customer_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || '👤';

                const reminderBadge = appt.reminder_sent 
                    ? '<span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 12px; background: rgba(39, 174, 96, 0.1); color: var(--success); border: 1px solid var(--success);">Reminder Sent</span>' 
                    : '<span style="font-size: 0.75rem; padding: 2px 6px; border-radius: 12px; background: rgba(243, 156, 18, 0.1); color: var(--warning); border: 1px solid var(--warning);">Pending</span>';

                item.innerHTML = `
                    <div class="queue-avatar" style="background: var(--primary-light); color: var(--primary-color); font-weight: bold; border-radius: 12px;">${initials}</div>
                    <div class="queue-info" style="flex: 1;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                            <h4 style="margin: 0; font-size: 1rem; color: var(--text-dark);">${appt.customer_name}</h4>
                            ${reminderBadge}
                        </div>
                        <p style="margin: 0; font-size: 0.85rem; color: var(--text-light);">
                            <i class="fas fa-calendar-check" style="margin-right: 4px;"></i> ${displayDate} • 
                            <i class="fas fa-phone" style="margin-right: 4px; margin-left: 4px;"></i> ${appt.phone_number}
                        </p>
                    </div>
                `;
                
                appointmentsList.appendChild(item);
            });
        } catch (error) {
            queueCount.textContent = 'Error';
            appointmentsList.innerHTML = `
                <div style="padding: 20px; text-align: center; color: var(--danger);">
                    Failed to load appointments.
                </div>
            `;
            console.error('Error fetching appointments:', error);
        }
    }

    function showMessage(text, type) {
        formMessage.textContent = text;
        formMessage.className = 'message'; // Reset classes
        formMessage.classList.add(type); // 'success' or 'error'
        formMessage.classList.remove('hidden');
        
        if (type === 'success') {
            formMessage.style.backgroundColor = 'rgba(39, 174, 96, 0.1)';
            formMessage.style.color = 'var(--success)';
            formMessage.style.border = '1px solid var(--success)';
        } else {
            formMessage.style.backgroundColor = 'rgba(231, 76, 60, 0.1)';
            formMessage.style.color = 'var(--danger)';
            formMessage.style.border = '1px solid var(--danger)';
        }

        setTimeout(() => {
            formMessage.classList.add('hidden');
        }, 5000);
    }
});
