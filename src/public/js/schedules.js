import { showMessage, clearMessage } from '../ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const blockForm = document.getElementById('block-form');
  const btnLoadBlocks = document.getElementById('btn-load-blocks');
  const blocksBody = document.getElementById('blocks-body');
  const msgDiv = document.getElementById('msg');
  
  const startDateInput = document.getElementById('start-date');
  const endDateInput = document.getElementById('end-date');

  startDateInput.addEventListener('change', () => {
    if (startDateInput.value) {
      endDateInput.min = startDateInput.value;
      if (endDateInput.value && endDateInput.value < startDateInput.value) {
        endDateInput.value = startDateInput.value;
      }
    }
  });

  blockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const adminId = document.getElementById('admin-id').value;
    const specialistId = document.getElementById('specialist-id').value;
    const type = document.getElementById('type').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const durationMinutes = parseInt(document.getElementById('duration').value, 10);

    clearMessage(msgDiv);
    
    if (!adminId) {
      showMessage(msgDiv, 'ID de Administrador requerido (Mock Session)', 'error');
      return;
    }
    
    if (new Date(startDate) >= new Date(endDate)) {
      showMessage(msgDiv, 'Error: La fecha de inicio debe ser anterior a la fecha de fin', 'error');
      return;
    }

    try {
      const response = await fetch('/api/schedules/blocks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-id': adminId
        },
        body: JSON.stringify({ specialistId, type, startDate, endDate, durationMinutes })
      });
      const data = await response.json();
      
      if (response.ok) {
        showMessage(msgDiv, 'Bloqueo añadido correctamente', 'success');
        btnLoadBlocks.click();
      } else {
        showMessage(msgDiv, data.error || 'Error añadiendo bloqueo', 'error');
      }
    } catch (err) {
      showMessage(msgDiv, 'Error de conexión', 'error');
    }
  });

  btnLoadBlocks.addEventListener('click', async () => {
    clearMessage(msgDiv);
    const adminId = document.getElementById('admin-id').value;
    if (!adminId) {
      showMessage(msgDiv, 'ID de Administrador requerido', 'error');
      return;
    }
    const specialistId = document.getElementById('specialist-id').value;
    
    try {
      const response = await fetch(`/api/schedules/blocks?specialistId=${specialistId}`, {
        headers: { 'x-admin-id': adminId }
      });
      const data = await response.json();
      if (response.ok) {
        blocksBody.innerHTML = '';
        if (data.blocks.length === 0) {
          blocksBody.innerHTML = '<tr><td colspan="3" class="muted">No hay bloqueos.</td></tr>';
          return;
        }
        data.blocks.forEach(block => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${block.type}</td>
            <td>${new Date(block.start_date).toLocaleString()}</td>
            <td>${new Date(block.end_date).toLocaleString()}</td>
          `;
          blocksBody.appendChild(tr);
        });
      } else {
        showMessage(msgDiv, data.error || 'Error cargando bloqueos', 'error');
      }
    } catch (err) {
      showMessage(msgDiv, 'Error de conexión', 'error');
    }
  });
});
