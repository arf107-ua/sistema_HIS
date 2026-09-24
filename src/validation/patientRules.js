import { body, param, query } from 'express-validator';
import { validateDocument } from './dni.js';

const HC_PATTERN = /^HC-\d{6}$/;

function checkDocumentField(field = 'documentNumber') {
  return body(field).custom((value) => {
    const result = validateDocument(value);
    if (!result.valid) {
      throw new Error(result.message);
    }
    return true;
  });
}

const firstName = body('firstName')
  .trim()
  .notEmpty().withMessage('El nombre es obligatorio')
  .isLength({ max: 80 }).withMessage('El nombre no puede superar 80 caracteres');

const lastName = body('lastName')
  .trim()
  .notEmpty().withMessage('Los apellidos son obligatorios')
  .isLength({ max: 120 }).withMessage('Los apellidos no pueden superar 120 caracteres');

const insuranceNumber = body('insuranceNumber')
  .trim()
  .notEmpty().withMessage('El número de seguro o mutua es obligatorio')
  .isLength({ max: 40 }).withMessage('El número de seguro no puede superar 40 caracteres');

const email = body('email')
  .optional({ values: 'falsy' })
  .trim()
  .isEmail().withMessage('El email no tiene un formato válido')
  .isLength({ max: 120 }).withMessage('El email no puede superar 120 caracteres');

const phone = body('phone')
  .optional({ values: 'falsy' })
  .matches(/^\+?[0-9()\-\s]{7,20}$/).withMessage('El teléfono solo puede contener dígitos, espacios, +, (, ) y - (7 a 20 caracteres)');

const birthDate = body('birthDate')
  .optional({ values: 'falsy' })
  .isISO8601().withMessage('La fecha de nacimiento no es una fecha válida')
  .custom((value) => {
    if (new Date(value) > new Date()) {
      throw new Error('La fecha de nacimiento no puede ser futura');
    }
    return true;
  });

const sex = body('sex')
  .optional({ values: 'null' })
  .isIn(['M', 'F', 'O']).withMessage('El sexo debe ser M, F u O');

const address = body('address')
  .optional({ values: 'falsy' })
  .trim()
  .isLength({ max: 200 }).withMessage('El domicilio no puede superar 200 caracteres');

const insurerName = body('insurerName')
  .optional({ values: 'falsy' })
  .trim()
  .isLength({ max: 80 }).withMessage('El nombre de aseguradora no puede superar 80 caracteres');

const documentType = body('documentType')
  .optional({ values: 'falsy' })
  .isIn(['DNI', 'NIE', 'OTHER']).withMessage('El tipo de documento debe ser DNI, NIE u OTHER');

export const createRules = [
  documentType,
  checkDocumentField('documentNumber'),
  firstName,
  lastName,
  insuranceNumber,
  email,
  phone,
  birthDate,
  sex,
  address,
  insurerName
];

export const updateRules = [
  body('id').not().exists().withMessage('El identificador no es editable'),
  body('hcCode').not().exists().withMessage('El código de historia clínica no es editable'),
  body('createdAt').not().exists().withMessage('La fecha de alta no es editable'),
  documentType,
  body('documentNumber')
    .optional({ values: 'falsy' })
    .custom((value) => {
      const result = validateDocument(value);
      if (!result.valid) throw new Error(result.message);
      return true;
    }),
  body('firstName')
    .optional({ values: 'falsy' })
    .trim()
    .notEmpty().withMessage('El nombre no puede quedar vacío')
    .isLength({ max: 80 }).withMessage('El nombre no puede superar 80 caracteres'),
  body('lastName')
    .optional({ values: 'falsy' })
    .trim()
    .notEmpty().withMessage('Los apellidos no pueden quedar vacíos')
    .isLength({ max: 120 }).withMessage('Los apellidos no pueden superar 120 caracteres'),
  body('insuranceNumber')
    .optional({ values: 'falsy' })
    .trim()
    .notEmpty().withMessage('El número de seguro no puede quedar vacío')
    .isLength({ max: 40 }).withMessage('El número de seguro no puede superar 40 caracteres'),
  email,
  phone,
  birthDate,
  sex,
  address,
  insurerName
];

export const searchRules = [
  query('document')
    .optional({ values: 'falsy' })
    .custom((value) => {
      const result = validateDocument(value);
      if (!result.valid) throw new Error(result.message);
      return true;
    }),
  query('hcCode')
    .optional({ values: 'falsy' })
    .customSanitizer((value) => String(value).trim().toUpperCase())
    .custom((value) => {
      if (!HC_PATTERN.test(value)) {
        throw new Error('El código de historia clínica debe tener formato HC-000001');
      }
      return true;
    })
];

export const idParamRules = [
  param('id').isUUID().withMessage('El identificador de paciente no es válido')
];
