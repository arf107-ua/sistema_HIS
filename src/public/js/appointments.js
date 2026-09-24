document.addEventListener('DOMContentLoaded', async () => {
  const patientSelect = document.getElementById('patient-id');
  const btnSearch = document.getElementById('btn-search');
  const slotsContainer = document.getElementById('slots-container');
  const slotsCard = document.getElementById('slots-card');
  const appointmentsBody = document.getElementById('appointments-body');
  const btnLoad = document.getElementById('btn-load-appointments');

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

  btnSearch.addEventListener('click', async () => {
    const specialty = document.getElementById('specialty').value;
    const centerId = document.getElementById('center-id').value;
    const date = document.getElementById('date').value;

    if (!specialty || !centerId || !date) {
      alert('Por favor complete centro, especialidad y fecha');
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
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            bookSlot(slot, centerId, specialty);
          });
          slotsContainer.appendChild(btn);
        });
      } else {
        alert(data.error || 'Error en la búsqueda');
      }
    } catch (err) {
      alert('Error buscando disponibilidad');
    }
  });

  async function bookSlot(date, centerId, specialty) {
    const patientId = patientSelect.value;
    if (!patientId) {
      alert('Selecciona un paciente primero en la sección Identificación.');
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
        btnSearch.click(); 
        btnLoad.click(); 
      } else {
        alert(data.error || 'Error reservando la cita');
      }
    } catch (err) {
      alert('Error de conexión reservando cita');
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
        alert(data.error || 'Error cancelando');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };

  window.rescheduleAppointment = async (id) => {
    const newDateStr = prompt('Introduce nueva fecha y hora (YYYY-MM-DDTHH:MM)', '2026-10-23T10:00');
    if (!newDateStr) return;
    const patientId = patientSelect.value;
    try {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-patient-id': patientId },
        body: JSON.stringify({ newDate: newDateStr })
      });
      if (response.ok) {
        btnLoad.click();
      } else {
        const data = await response.json();
        alert(data.error || 'Error reprogramando');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  };
});
