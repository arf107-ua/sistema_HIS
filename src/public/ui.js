export function clearMessage(el) {
  el.classList.remove('show', 'error', 'success');
  el.textContent = '';
}

export function showMessage(el, text, type) {
  el.textContent = text;
  el.className = `msg show ${type}`;
}

export function errorFromPayload(payload, fallback) {
  if (payload && payload.error) {
    const details = Array.isArray(payload.error.details)
      ? payload.error.details.map((d) => d.message).join('. ')
      : '';
    return details ? `${payload.error.message}: ${details}` : payload.error.message;
  }
  return fallback;
}

export function setCell(td, value) {
  td.textContent = value ?? '—';
}
