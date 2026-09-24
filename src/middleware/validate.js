import { validationResult } from 'express-validator';
import { validationError } from './errorHandler.js';

export function validate(rules) {
  return async (req, _res, next) => {
    await Promise.all(rules.map((rule) => rule.run(req)));
    const result = validationResult(req);
    if (result.isEmpty()) {
      next();
      return;
    }
    next(
      validationError(
        'Datos de entrada inválidos',
        result.array().map((e) => ({ field: e.path, message: e.msg }))
      )
    );
  };
}
