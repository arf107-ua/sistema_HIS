import { clearMessage, errorFromPayload, setCell, showMessage } from './ui.js';

window.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('search-form');
  const msg = document.getElementById('msg');
  const resultsBody = document.getElementById('results-body');
  const emptyRow = document.getElementById('empty-row');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessage(msg);
    resultsBody.innerHTML = '';

    const documentValue = form.document.value.trim();
    const hcValue = form.hcCode.value.trim();

    if (!documentValue && !hcValue) {
      showMessage(msg, 'Indique un documento de identidad o un código de historia clínica.', 'error');
      emptyRow.hidden = false;
      return;
    }
    if (documentValue && hcValue) {
      showMessage(msg, 'Indique solo un criterio: documento o código de historia clínica.', 'error');
      emptyRow.hidden = false;
      return;
    }

    const params = new URLSearchParams();
    if (documentValue) params.set('document', documentValue);
    if (hcValue) params.set('hcCode', hcValue);

    try {
      const response = await fetch(`/api/patients/search?${params.toString()}`);
      const payload = await response.json();

      if (!response.ok) {
        showMessage(msg, errorFromPayload(payload, 'Error en la búsqueda.'), 'error');
        emptyRow.hidden = false;
        return;
      }

      if (!Array.isArray(payload) || payload.length === 0) {
        showMessage(msg, 'No se han encontrado coincidencias.', 'success');
        emptyRow.hidden = false;
        return;
      }

      emptyRow.hidden = true;
      for (const patient of payload) {
        const tr = document.createElement('tr');

        const idTd = document.createElement('td');
        const idCode = document.createElement('code');
        idCode.className = 'identidad';
        idCode.textContent = patient.id;
        idTd.appendChild(idCode);

        const hcTd = document.createElement('td');
        setCell(hcTd, patient.hcCode);

        const nameTd = document.createElement('td');
        setCell(nameTd, `${patient.firstName} ${patient.lastName}`);

        const docTd = document.createElement('td');
        setCell(docTd, `${patient.documentType}: ${patient.documentNumber}`);

        const contactTd = document.createElement('td');
        setCell(contactTd, [patient.phone, patient.email].filter(Boolean).join(' · '));

        const actionsTd = document.createElement('td');
        const editLink = document.createElement('a');
        editLink.href = `/form.html?id=${encodeURIComponent(patient.id)}`;
        editLink.textContent = 'Editar';
        actionsTd.appendChild(editLink);

        tr.append(idTd, hcTd, nameTd, docTd, contactTd, actionsTd);
        resultsBody.appendChild(tr);
      }
      showMessage(msg, `${payload.length} resultado(s).`, 'success');
    } catch {
      showMessage(msg, 'No se pudo completar la búsqueda.', 'error');
      emptyRow.hidden = false;
    }
  });
});
