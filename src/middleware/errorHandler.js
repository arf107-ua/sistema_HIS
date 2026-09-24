export class AppError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function notFound(message = 'Paciente no encontrado') {
  return new AppError(404, 'PATIENT_NOT_FOUND', message);
}

export function duplicateDocument(message = 'Ya existe un paciente registrado con ese documento de identidad') {
  return new AppError(409, 'DOCUMENT_ALREADY_REGISTERED', message);
}

export function invalidSearch(message = 'Indique exactamente un criterio de búsqueda: document o hcCode') {
  return new AppError(400, 'INVALID_SEARCH_CRITERIA', message);
}

export function validationError(message = 'Datos de entrada inválidos', details) {
  return new AppError(400, 'VALIDATION_ERROR', message, details);
}

export function requiredEmpty(message = 'Los campos obligatorios no pueden quedar vacíos', details) {
  return new AppError(400, 'REQUIRED_FIELD_EMPTY', message, details);
}

export function errorHandler(err, _req, res, _next) {
  if (err instanceof AppError) {
    res.status(err.status).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details ? { details: err.details } : {})
      }
    });
    return;
  }

  if (err.type === 'entity.parse.failed') {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Cuerpo JSON inválido' }
    });
    return;
  }

  if (err.type === 'entity.too.large') {
    res.status(413).json({
      error: { code: 'PAYLOAD_TOO_LARGE', message: 'El cuerpo de la petición supera el tamaño permitido' }
    });
    return;
  }

  console.error(err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'Error interno del servidor' }
  });
}
