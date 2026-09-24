const LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE';

export function normalizeDocument(value) {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
}

function dniLetter(digits) {
  return LETTERS[Number(digits) % 23];
}

export function detectDocumentType(normalized) {
  if (/^\d{8}[A-Z]$/.test(normalized)) return 'DNI';
  if (/^[XYZ]\d{7}[A-Z]$/.test(normalized)) return 'NIE';
  if (/^[A-Z0-9]{5,20}$/.test(normalized)) return 'OTHER';
  return null;
}

/**
 * Valida documento de identidad (research R3 / FR-003).
 * @returns {{ valid: boolean, type: string|null, normalized: string, message?: string }}
 */
export function validateDocument(value) {
  const normalized = normalizeDocument(value);

  if (!normalized) {
    return { valid: false, type: null, normalized, message: 'El documento de identidad es obligatorio' };
  }

  const dniMatch = normalized.match(/^(\d{8})([A-Z])$/);
  if (dniMatch) {
    const expected = dniLetter(dniMatch[1]);
    if (dniMatch[2] !== expected) {
      return {
        valid: false,
        type: 'DNI',
        normalized,
        message: `Letra de control de DNI inválida (se esperaba ${expected})`
      };
    }
    return { valid: true, type: 'DNI', normalized };
  }

  const nieMatch = normalized.match(/^([XYZ])(\d{7})([A-Z])$/);
  if (nieMatch) {
    const prefixMap = { X: '0', Y: '1', Z: '2' };
    const digits = prefixMap[nieMatch[1]] + nieMatch[2];
    const expected = dniLetter(digits);
    if (nieMatch[3] !== expected) {
      return {
        valid: false,
        type: 'NIE',
        normalized,
        message: `Letra de control de NIE inválida (se esperaba ${expected})`
      };
    }
    return { valid: true, type: 'NIE', normalized };
  }

  if (/^(?=.*[A-Z])(?=.*[0-9])[A-Z0-9]{5,20}$/.test(normalized)) {
    return { valid: true, type: 'OTHER', normalized };
  }

  return {
    valid: false,
    type: null,
    normalized,
    message: 'Formato de documento inválido (DNI 8 dígitos + letra, NIE con X/Y/Z, u otro documento de 5 a 20 caracteres alfanuméricos con al menos una letra y un dígito)'
  };
}
