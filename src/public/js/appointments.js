import { showMessage, clearMessage } from '../ui.js';

document.addEventListener('DOMContentLoaded', async () => {
  const patientSearch = document.getElementById('patient-search');
  let patientsData = [];
  const btnSearch = document.getElementById('btn-search');
  const slotsContainer = document.getElementById('slots-container');
  const slotsCard = document.getElementById('slots-card');
  const appointmentsBody = document.getElementById('appointments-body');
  const btnLoad = document.getElementById('btn-load-appointments');
  const msgDiv = document.getElementById('msg');
  
  let reschedulingAppointmentId = null;

  const cancelModal = document.getElementById('cancel-modal');
  const btnCancelYes = document.getElementById('btn-cancel-yes');
  const btnCancelNo = document.getElementById('btn-cancel-no');
  let appointmentToCancel = null;

  if (btnCancelNo && cancelModal) {
    btnCancelNo.addEventListener('click', () => {
      cancelModal.style.display = 'none';
      appointmentToCancel = null;
    });
  }

  if (btnCancelYes && cancelModal) {
    btnCancelYes.addEventListener('click', async () => {
      if (!appointmentToCancel) return;
      cancelModal.style.display = 'none';
      const id = appointmentToCancel;
      const patientId = patientSearch.value;
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
    });
  }

  try {
    const res = await fetch('/api/patients');
    if (res.ok) {
      patientsData = await res.json();
      patientSearch.innerHTML = '<option value="">-- Selecciona un paciente --</option>';
      patientsData.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.firstName} ${p.lastName} (DNI: ${p.documentNumber})`;
        patientSearch.appendChild(opt);
      });
    }
  } catch (err) {
    console.error(err);
  }

  patientSearch.addEventListener('change', () => {
    slotsCard.style.display = 'none';
    const patientId = patientSearch.value;
    
    if (patientId) {
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
        
        data.slots.forEach(slotItem => {
          const btn = document.createElement('button');
          const timeStr = typeof slotItem === 'string' ? slotItem : slotItem.time;
          const isAvail = typeof slotItem === 'string' ? true : slotItem.available;
          const reason = typeof slotItem === 'string' ? '' : slotItem.reason;

          btn.textContent = new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          if (!isAvail) {
            btn.disabled = true;
            btn.style.textDecoration = 'line-through';
            btn.style.opacity = '0.5';
            btn.style.cursor = 'not-allowed';
            btn.style.backgroundColor = 'var(--border)';
            btn.style.color = 'var(--muted)';
            btn.style.borderColor = 'transparent';
            btn.title = reason || 'No disponible';
          } else {
            if (reschedulingAppointmentId) {
              btn.style.backgroundColor = 'var(--warning, #f59e0b)';
              btn.style.borderColor = 'var(--warning, #f59e0b)';
            }
            btn.addEventListener('click', (e) => {
              e.preventDefault();
              bookSlot(timeStr, centerId, specialty);
            });
          }
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
    const patientId = patientSearch.value;
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
    const patientId = patientSearch.value;
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
          if (app.status === 'CONFIRMED' || app.status === 'REQUIRES_RESCHEDULE') {
            actions = `
              <button onclick="cancelAppointment('${app.id}')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem; background: var(--input-bg); border: 1px solid var(--border); color: var(--text);">Cancelar</button>
              <button onclick="rescheduleAppointment('${app.id}', '${app.center_id}', '${app.specialty}')" style="padding: 0.3rem 0.6rem; font-size: 0.8rem;">Reprogramar</button>
            `;
          }
          
          let statusColor = 'var(--muted)';
          if (app.status === 'CONFIRMED') statusColor = 'var(--success)';
          else if (app.status === 'REQUIRES_RESCHEDULE') statusColor = 'var(--warning, #f59e0b)';
          
          const statusMap = {
            'CONFIRMED': 'CONFIRMADA',
            'CANCELLED': 'CANCELADA',
            'RESCHEDULED': 'REPROGRAMADA',
            'COMPLETED': 'COMPLETADA',
            'REQUIRES_RESCHEDULE': 'REPROGRAMACIÓN REQUERIDA'
          };
          const displayStatus = statusMap[app.status] || app.status;
          
          tr.innerHTML = `
            <td>${app.specialty}</td>
            <td>${dateStr}</td>
            <td><span style="color: ${statusColor}; font-weight: ${app.status === 'REQUIRES_RESCHEDULE' ? '600' : 'normal'}">${displayStatus}</span></td>
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

  window.cancelAppointment = (id) => {
    appointmentToCancel = id;
    if (cancelModal) cancelModal.style.display = 'flex';
  };

  window.rescheduleAppointment = async (id, centerId, specialty) => {
    reschedulingAppointmentId = id;
    
    Swal.fire({
      title: 'Reprogramar Cita',
      html: `
        <p style="margin-bottom: 1rem; color: var(--muted); font-size: 0.95rem;">Seleccione una nueva fecha para su cita de <strong>${specialty}</strong>:</p>
        <div style="margin-bottom: 1.5rem; display: flex; justify-content: center;">
          <input type="text" id="reschedule-date" style="text-align: center; max-width: 200px; cursor: pointer;" placeholder="Elegir Fecha...">
        </div>
        <div id="reschedule-slots" class="slots-grid" style="max-height: 220px; overflow-y: auto; text-align: left; padding: 0.5rem;"></div>
      `,
      showCancelButton: true,
      showConfirmButton: false,
      cancelButtonText: 'Cancelar',
      didOpen: () => {
        const dateInput = document.getElementById('reschedule-date');
        const slotsContainer = document.getElementById('reschedule-slots');
        
        flatpickr(dateInput, {
          locale: "es",
          altInput: true,
          altFormat: "d/m/Y",
          dateFormat: "Y-m-d",
          minDate: "today",
          onChange: async (selectedDates, dateStr) => {
            if (!dateStr) return;
            slotsContainer.innerHTML = '<p class="muted" style="grid-column: 1/-1; text-align: center;">Buscando...</p>';
            try {
              const res = await fetch(`/api/appointments/slots?centerId=${centerId}&specialty=${specialty}&date=${dateStr}`);
              const data = await res.json();
              if (res.ok) {
                slotsContainer.innerHTML = '';
                if (data.slots.length === 0) {
                  slotsContainer.innerHTML = '<p class="muted" style="grid-column: 1/-1; text-align: center;">No hay huecos disponibles.</p>';
                  return;
                }
                data.slots.forEach(slotItem => {
                  const btn = document.createElement('button');
                  const timeStr = typeof slotItem === 'string' ? slotItem : slotItem.time;
                  const isAvail = typeof slotItem === 'string' ? true : slotItem.available;
                  
                  btn.textContent = new Date(timeStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  if (!isAvail) {
                    btn.disabled = true;
                    btn.style.opacity = '0.5';
                    btn.style.cursor = 'not-allowed';
                    btn.style.textDecoration = 'line-through';
                  } else {
                    btn.style.backgroundColor = 'var(--primary-light)';
                    btn.style.borderColor = 'var(--primary)';
                    btn.style.color = 'var(--primary-dark)';
                    btn.addEventListener('click', async (e) => {
                      e.preventDefault();
                      Swal.close();
                      await bookSlot(timeStr, centerId, specialty);
                    });
                  }
                  slotsContainer.appendChild(btn);
                });
              } else {
                slotsContainer.innerHTML = `<p style="grid-column: 1/-1; color: var(--danger); text-align: center;">${data.error || 'Error'}</p>`;
              }
            } catch (err) {
              slotsContainer.innerHTML = '<p style="grid-column: 1/-1; color: var(--danger); text-align: center;">Error al buscar huecos.</p>';
            }
          }
        });
      },
      willClose: () => {
        reschedulingAppointmentId = null;
      }
    });
  };
});
