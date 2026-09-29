import { showMessage, clearMessage } from '../ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  const patientSelect = document.getElementById('patient-id');
  const btnSearch = document.getElementById('btn-search');
  const slotsContainer = document.getElementById('slots-container');
  const slotsCard = document.getElementById('slots-card');
  const appointmentsBody = document.getElementById('appointments-body');
  const btnLoad = document.getElementById('btn-load-appointments');
  const msgDiv = document.getElementById('msg');
  
  let reschedulingAppointmentId = null;

  try {
    const res = await fetch('/api/patients');
    if (res.ok) {
      const patients = await res.json();
      patientSelect.innerHTML = '<option value="">Selecciona un paciente...</option>';
      patients.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.firstName} ${p.lastName} (DNI: ${p.documentNumber})`;
        patientSelect.appendChild(opt);
      });
    }
  } catch (err) {
    console.error(err);
    patientSelect.innerHTML = '<option value="">Error cargando pacientes</option>';
  }

  patientSelect.addEventListener('change', () => {
    slotsCard.style.display = 'none';
    if (patientSelect.value) {
      btnLoad.click();
    } else {
      appointmentsBody.innerHTML = '<tr><td colspan="4" class="muted">Selecciona un paciente arriba.</td></tr>';
    }
  });

  const dateInput = document.getElementById('date');
  const centerInput = document.getElementById('center-id');
  const specialtyInput = document.getElementById('specialty');

  [dateInput, centerInput, specialtyInput].forEach(input => {
    input.addEventListener('input', () => {
      slotsCard.style.display = 'none';
      slotsContainer.innerHTML = '';
      if (!reschedulingAppointmentId) {
        clearMessage(msgDiv);
      }
    });
  });

  btnSearch.addEventListener('click', async () => {
    const specialty = specialtyInput.value;
    const centerId = centerInput.value;
    const date = dateInput.value;

    if (!reschedulingAppointmentId) {
      clearMessage(msgDiv);
    }

    if (!specialty || !centerId || !date) {
      showMessage(msgDiv, 'Por favor complete centro, especialidad y fecha', 'error');
      return;
    }

    try {
      const response = await fetch(`/api/appointments/slots?centerId=${centerId}&specialty=${specialty}&date=${date}`);
      const data = await response.json();
      
      if (response.ok) {
        slotsCard.style.display = 'block';
        slotsContainer.innerHTML = '';
        if (data.slots.length === 0) {
          slotsContainer.innerHTML = '<p class="muted" style="grid-column: 1/-1;">No hay huecos disponibles para esa fecha.</p>';
          return;
        }
        
        data.slots.forEach(slot => {
          const btn = document.createElement('button');
          btn.textContent = new Date(slot).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          if (reschedulingAppointmentId) {
            btn.style.backgroundColor = 'var(--warning, #f59e0b)';
            btn.style.borderColor = 'var(--warning, #f59e0b)';
          }
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            bookSlot(slot, centerId, specialty);
          });
          slotsContainer.appendChild(btn);
        });
      } else {
        showMessage(msgDiv, data.error || 'Error en la búsqueda', 'error');
      }
    } catch (err) {
      showMessage(msgDiv, 'Error buscando disponibilidad', 'error');
    }
  });

  async function bookSlot(date, centerId, specialty) {
    const patientId = patientSelect.value;
    if (!patientId) {
      showMessage(msgDiv, 'Selecciona un paciente primero en la sección Identificación.', 'error');
      return;
    }

    if (reschedulingAppointmentId) {
      try {
        const response = await fetch(`/api/appointments/${reschedulingAppointmentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'x-patient-id': patientId },
          body: JSON.stringify({ newDate: date })
        });
        const data = await response.json();
        
        if (response.ok) {
          reschedulingAppointmentId = null;
          showMessage(msgDiv, 'Cita reprogramada con éxito', 'success');
          btnSearch.click(); 
          btnLoad.click(); 
        } else {
          showMessage(msgDiv, data.error || 'Error reprogramando la cita', 'error');
        }
      } catch (err) {
        showMessage(msgDiv, 'Error de conexión reprogramando cita', 'error');
      }
      return;
    }

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-patient-id': patientId
        },
        body: JSON.stringify({ centerId, specialty, date })
      });
      const data = await response.json();
      
      if (response.ok) {
        showMessage(msgDiv, 'Cita reservada con éxito', 'success');
        btnSearch.click(); 
        btnLoad.click(); 
      } else {
        showMessage(msgDiv, data.error || 'Error reservando la cita', 'error');
      }
    } catch (err) {
      showMessage(msgDiv, 'Error de conexión reservando cita', 'error');
    }
  }

  btnLoad.addEventListener('click', async () => {
    const patientId = patientSelect.value;
    if (!patientId) return;
    
    try {
      const response = await fetch('/api/appointments', {
        headers: { 'x-patient-id': patientId }
      });
      const data = await response.json();
      if (response.ok) {
        appointmentsBody.innerHTML = '';
        if (data.appointments.length === 0) {
          appointmentsBody.innerHTML = '<tr><td colspan="4" class="muted">No tienes citas.</td></tr>';
          return;
        }
        data.appointments.forEach(app => {
          const tr = document.createElement('tr');
          const dateStr = new Date(app.appointment_date).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
          
          let actions = '';
          if (app.status === 'CONFIRMED') {
            actions = `
              <button onclick="cancelAppointment('${app.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--input-bg); border: 1px solid var(--border); color: var(--text);">Cancelar</button>
              <button onclick="rescheduleAppointment('${app.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">Reprogramar</button>
            `;
          }
          
          tr.innerHTML = `
            <td>${app.specialty}</td>
            <td>${dateStr}</td>
            <td><span style="color: ${app.status === 'CONFIRMED' ? 'var(--success)' : 'var(--muted)'}">${app.status}</span></td>
            <td style="display:flex; gap: 0.5rem;">${actions}</td>
          `;
          appointmentsBody.appendChild(tr);
        });
      } else {
        console.error(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  });

  window.cancelAppointment = async (id) => {
    if (!confirm('¿Seguro que deseas cancelar esta cita?')) return;
    const patientId = patientSelect.value;
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
        headers: { 'x-patient-id': patientId }
      });
      if (response.ok) {
        btnLoad.click();
      } else {
        const data = await response.json();
        showMessage(msgDiv, data.error || 'Error cancelando', 'error');
      }
    } catch (err) {
      showMessage(msgDiv, 'Error de conexión', 'error');
    }
  };

  window.rescheduleAppointment = async (id) => {
    reschedulingAppointmentId = id;
    
    msgDiv.innerHTML = `
      <strong>Modo Reprogramación Activo</strong>: Por favor, busque la nueva fecha deseada arriba y seleccione una hora para trasladar esta cita.
      <button id="btn-cancel-reschedule" style="margin-left: 10px; padding: 0.2rem 0.5rem; font-size: 0.8rem; background: transparent; border: 1px solid white; color: white;">Cancelar</button>
    `;
    msgDiv.className = 'msg show success';
    msgDiv.style.backgroundColor = 'var(--warning, #f59e0b)';
    msgDiv.style.color = 'white';
    
    document.getElementById('btn-cancel-reschedule').addEventListener('click', () => {
      reschedulingAppointmentId = null;
      clearMessage(msgDiv);
      msgDiv.style.backgroundColor = '';
      msgDiv.style.color = '';
      if (slotsCard.style.display === 'block') btnSearch.click();
    });

    dateInput.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
});
