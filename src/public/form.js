import { clearMessage, errorFromPayload, showMessage } from './ui.js';

const form = document.getElementById('patient-form');
const msg = document.getElementById('msg');
const title = document.getElementById('form-title');
const identityBox = document.getElementById('identity-box');
const submitBtn = document.getElementById('submit-btn');

const params = new URLSearchParams(window.location.search);
const editId = params.get('id');
let currentPatient = null;

const FIELD_NAMES = [
  'documentType',
  'documentNumber',
  'firstName',
  'lastName',
  'insuranceNumber',
  'insurerName',
  'birthDate',
  'sex',
  'phone',
  'email',
  'address'
];

function fillForm(patient) {
  for (const name of FIELD_NAMES) {
    const input = form.elements.namedItem(name);
    if (!input) continue;
    input.value = patient[name] ?? '';
  }
}

function showIdentity(patient, prefix) {
  identityBox.hidden = false;
  
  identityBox.innerHTML = `
    <div class="identity-content" style="flex-direction: row; align-items: center; padding: 1rem 1.5rem;">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--primary);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
      <div class="identity-badges" style="margin: 0; padding: 0; background: transparent; border: none; flex-direction: row; align-items: center; gap: 1.5rem; box-shadow: none;">
        <div class="badge-group">
          <span class="badge-label">Identidad Única</span>
          <code class="identidad">${patient.id}</code>
        </div>
        <div class="badge-divider"></div>
        <div class="badge-group">
          <span class="badge-label">Historia Clínica</span>
          <code class="identidad">${patient.hcCode}</code>
        </div>
      </div>
    </div>
  `;
}

async function loadForEdit() {
  title.textContent = 'Editar datos del paciente';
  submitBtn.textContent = 'Guardar cambios';
  try {
    const response = await fetch(`/api/patients/${encodeURIComponent(editId)}`);
    const payload = await response.json();
    if (!response.ok) {
      showMessage(msg, errorFromPayload(payload, 'Paciente no encontrado.'), 'error');
      submitBtn.disabled = true;
      return;
    }
    currentPatient = payload;
    fillForm(payload);
    showIdentity(payload, 'Datos del paciente');
    showMessage(msg, 'Paciente cargado. Modifique los datos que desee actualizar.', 'success');
  } catch {
    showMessage(msg, 'No se pudo cargar el paciente.', 'error');
    submitBtn.disabled = true;
  }
}

function collectBody() {
  const body = {};

  for (const name of FIELD_NAMES) {
    const input = form.elements.namedItem(name);
    if (!input) continue;
    if (name === 'documentType' || name === 'documentNumber') continue;
    const value = typeof input.value === 'string' ? input.value.trim() : input.value;
    if (value !== '') body[name] = value;
    else if (currentPatient) body[name] = null;
  }

  body.documentType = form.documentType.value;
  body.documentNumber = form.documentNumber.value.trim();

  if (form.sex.value) body.sex = form.sex.value;
  else if (currentPatient) body.sex = null;

  return body;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearMessage(msg);

  const body = collectBody();

  try {
    if (currentPatient) {
      const response = await fetch(`/api/patients/${encodeURIComponent(currentPatient.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok) {
        showMessage(msg, errorFromPayload(payload, 'No se pudo actualizar.'), 'error');
        return;
      }
      currentPatient = payload;
      showIdentity(payload, 'Identidad preservada: ');
      showMessage(
        msg,
        `Actualización correcta. Identidad única y código HC inalterados (${payload.hcCode}).`,
        'success'
      );
      return;
    }

    const response = await fetch('/api/patients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const payload = await response.json();
    if (!response.ok) {
      showMessage(msg, errorFromPayload(payload, 'No se pudo registrar el paciente.'), 'error');
      return;
    }
    showIdentity(payload, 'Paciente registrado. Identidad única: ');
    showMessage(msg, `Alta completada. Código de historia clínica: ${payload.hcCode}`, 'success');
    form.reset();
  } catch {
    showMessage(msg, 'Error de comunicación con el servidor.', 'error');
  }
});

if (editId) {
  loadForEdit();
}
