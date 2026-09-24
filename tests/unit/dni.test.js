import { detectDocumentType, normalizeDocument, validateDocument } from '../../src/validation/dni.js';

describe('validación de DNI/NIE (FR-003)', () => {
  test('DNI válido 12345678Z', () => {
    const result = validateDocument('12345678Z');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('DNI');
    expect(result.normalized).toBe('12345678Z');
  });

  test('DNI con letra errónea 12345678A es inválido', () => {
    const result = validateDocument('12345678A');
    expect(result.valid).toBe(false);
    expect(result.message).toMatch(/letra de control/i);
  });

  test('DNI en minúsculas y con espacios se normaliza', () => {
    const result = validateDocument('  12345678z  ');
    expect(result.valid).toBe(true);
    expect(result.normalized).toBe('12345678Z');
  });

  test('NIE válido X1234567L', () => {
    const result = validateDocument('X1234567L');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('NIE');
  });

  test('NIE con letra errónea inválido', () => {
    const result = validateDocument('X1234567A');
    expect(result.valid).toBe(false);
    expect(result.type).toBe('NIE');
  });

  test('documento OTHER alfanumérico 5-20 caracteres', () => {
    const result = validateDocument('AB1234567');
    expect(result.valid).toBe(true);
    expect(result.type).toBe('OTHER');
  });

  test('documento OTHER demasiado corto inválido', () => {
    expect(validateDocument('AB12').valid).toBe(false);
  });

  test('documento vacío inválido', () => {
    expect(validateDocument('').valid).toBe(false);
    expect(validateDocument(null).valid).toBe(false);
  });

  test('longitud incorrecta de DNI inválida', () => {
    expect(validateDocument('1234567').valid).toBe(false);
    expect(validateDocument('123456789Z').type).toBe('OTHER');
  });

  test('normalizeDocument elimina espacios y pasa a mayúsculas', () => {
    expect(normalizeDocument(' x123 4567 l ')).toBe('X1234567L');
  });

  test('detectDocumentType identifica tipos', () => {
    expect(detectDocumentType('12345678Z')).toBe('DNI');
    expect(detectDocumentType('X1234567L')).toBe('NIE');
    expect(detectDocumentType('AB1234567')).toBe('OTHER');
    expect(detectDocumentType('!!')).toBeNull();
  });
});
