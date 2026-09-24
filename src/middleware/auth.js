export function requirePatientSession(req, res, next) {
  const patientId = req.headers['x-patient-id'];
  if (!patientId) {
    return res.status(401).json({ error: 'Unauthorized: Missing x-patient-id header (Mock Auth)' });
  }
  req.patient = { id: patientId };
  next();
}

export function requireAdminSession(req, res, next) {
  const adminId = req.headers['x-admin-id'];
  if (!adminId) {
    return res.status(401).json({ error: 'Unauthorized: Missing x-admin-id header (Mock Auth)' });
  }
  req.admin = { id: adminId };
  next();
}
