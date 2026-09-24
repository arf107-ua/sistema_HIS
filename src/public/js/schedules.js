document.addEventListener('DOMContentLoaded', () => {
  const blockForm = document.getElementById('block-form');
  const btnLoadBlocks = document.getElementById('btn-load-blocks');
  const blocksBody = document.getElementById('blocks-body');

  blockForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const adminId = document.getElementById('admin-id').value;
    const specialistId = document.getElementById('specialist-id').value;
    const type = document.getElementById('type').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;
    const durationMinutes = parseInt(document.getElementById('duration').value, 10);

    if (!adminId) {
      alert('ID de Administrador requerido (Mock Session)');
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
        alert('Bloqueo añadido correctamente');
        btnLoadBlocks.click();
      } else {
        alert(data.error || 'Error añadiendo bloqueo');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  });

  btnLoadBlocks.addEventListener('click', async () => {
    const adminId = document.getElementById('admin-id').value;
    if (!adminId) {
      alert('ID de Administrador requerido');
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
        alert(data.error || 'Error cargando bloqueos');
      }
    } catch (err) {
      alert('Error de conexión');
    }
  });
});
