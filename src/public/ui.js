export function clearMessage(el) {
  el.classList.remove('show', 'error', 'success');
  el.textContent = '';
  if (el._msgTimeout) clearTimeout(el._msgTimeout);
}

export function showMessage(el, text, type, duration = 4000) {
  if (window.Swal) {
    const Toast = Swal.mixin({
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: duration,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });

    Toast.fire({
      icon: type === 'error' ? 'error' : 'success',
      title: text
    });
  } else {
    // Fallback if Swal didn't load
    el.textContent = text;
    el.className = `msg show ${type}`;
    if (duration > 0) {
      if (el._msgTimeout) clearTimeout(el._msgTimeout);
      el._msgTimeout = setTimeout(() => {
        el.classList.remove('show');
      }, duration);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.flatpickr) {
    flatpickr("input[type=date]", {
      locale: "es",
      altInput: true,
      altFormat: "d/m/Y",
      dateFormat: "Y-m-d",
      minDate: "today"
    });
  }
});

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
