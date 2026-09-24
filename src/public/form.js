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
  identityBox.textContent = '';
  const line = document.createElement('div');
  line.append(prefix);
  const idCode = document.createElement('code');
  idCode.className = 'identidad';
  idCode.textContent = patient.id;
  const hcCode = document.createElement('code');
  hcCode.className = 'identidad';
  hcCode.textContent = patient.hcCode;
  line.append(idCode, ' · Historia clínica: ', hcCode);
  identityBox.appendChild(line);
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
    showIdentity(payload, 'Identidad única: ');
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
