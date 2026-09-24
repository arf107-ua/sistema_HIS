import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  createRules,
  idParamRules,
  searchRules,
  updateRules
} from '../validation/patientRules.js';

export function createPatientsRouter({ patientService }) {
  const router = Router();

  router.get('/', (req, res, next) => {
    try {
      res.status(200).json(patientService.getAll());
    } catch (err) {
      next(err);
    }
  });

  router.post('/', validate(createRules), (req, res, next) => {
    try {
      res.status(201).json(patientService.create(req.body));
    } catch (err) {
      next(err);
    }
  });

  router.get('/search', validate(searchRules), (req, res, next) => {
    try {
      res.status(200).json(patientService.search(req.query));
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', validate(idParamRules), (req, res, next) => {
    try {
      res.status(200).json(patientService.getById(req.params.id));
    } catch (err) {
      next(err);
    }
  });

  router.patch('/:id', validate([...idParamRules, ...updateRules]), (req, res, next) => {
    try {
      res.status(200).json(patientService.update(req.params.id, req.body));
    } catch (err) {
      next(err);
    }
  });

  return router;
}
