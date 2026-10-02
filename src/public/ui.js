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
    // 1. Fechas de nacimiento (permitir fechas pasadas, mostrar selector de año)
    flatpickr("input[name='birthDate']", {
      locale: "es",
      altInput: true,
      altFormat: "d/m/Y",
      dateFormat: "Y-m-d",
      minDate: "1900-01-01",
      maxDate: "today",
      onReady: function(selectedDates, dateStr, instance) {
        addYearDropdown(instance, 1900, new Date().getFullYear());
      }
    });

    // 2. Otras fechas (citas, búsquedas, etc.)
    flatpickr("input[type=date]:not([name='birthDate'])", {
      locale: "es",
      altInput: true,
      altFormat: "d/m/Y",
      dateFormat: "Y-m-d",
      minDate: "today",
      onReady: function(selectedDates, dateStr, instance) {
        addYearDropdown(instance, new Date().getFullYear(), new Date().getFullYear() + 10);
      }
    });

    // 3. Fechas y horas (bloqueos de agenda, etc.)
    flatpickr("input[type=datetime-local]", {
      locale: "es",
      enableTime: true,
      altInput: true,
      altFormat: "d/m/Y H:i",
      dateFormat: "Y-m-d\\TH:i",
      time_24hr: true,
      minDate: "today",
      onReady: function(selectedDates, dateStr, instance) {
        addYearDropdown(instance, new Date().getFullYear(), new Date().getFullYear() + 10);
      }
    });
  }
});

export function addYearDropdown(instance, minYear, maxYear) {
  if (!instance.currentYearElement) return;
  console.log("Adding year dropdown for flatpickr instance");
  const wrapper = instance.currentYearElement.parentNode;
  const select = document.createElement("select");
  // Usamos la misma clase que el dropdown del mes para heredar su diseño
  select.className = "flatpickr-monthDropdown-months";
  select.style.width = "auto";
  select.style.marginLeft = "1ch";
  select.style.padding = "0";
  select.style.border = "none";
  select.style.background = "transparent";
  select.style.color = "inherit"; // Heredará el blanco de la barra de título
  select.style.fontWeight = "inherit";
  select.style.cursor = "pointer";
  select.style.appearance = "auto";
  select.style.display = "inline-block";
  
  // Función para crear opciones asegurando que se lean bien (fondo nativo)
  const createOption = (val) => {
    const option = document.createElement("option");
    option.value = val;
    option.text = val;
    option.style.color = "black"; // Evitar texto blanco sobre fondo blanco en el desplegable
    return option;
  };

  if (maxYear === new Date().getFullYear() && minYear === 1900) {
    for (let i = maxYear; i >= minYear; i--) {
      select.appendChild(createOption(i));
    }
  } else {
    for (let i = minYear; i <= maxYear; i++) {
      select.appendChild(createOption(i));
    }
  }
  
  select.value = instance.currentYear;
  
  select.addEventListener("change", (e) => {
    instance.changeYear(parseInt(e.target.value, 10));
  });
  
  if (!instance.config.onYearChange) {
    instance.config.onYearChange = [];
  }
  instance.config.onYearChange.push(() => {
    select.value = instance.currentYear;
  });

  // Ocultar solo el input nativo y las flechas para que Flatpickr no falle al intentar actualizar el valor
  instance.currentYearElement.style.display = "none";
  const arrows = wrapper.querySelectorAll(".arrowUp, .arrowDown");
  arrows.forEach(a => a.style.display = "none");

  // Ajustar el contenedor original para que quepa el desplegable
  wrapper.style.width = "auto";
  wrapper.style.display = "inline-block";
  wrapper.style.padding = "0";

  // Insertar nuestro desplegable personalizado dentro del wrapper
  wrapper.appendChild(select);
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
