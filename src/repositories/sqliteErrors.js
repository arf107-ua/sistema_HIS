export function isUniqueDocumentViolation(err) {
  if (!err) return false;
  const message = String(err.message || '');
  return (
    message.includes('UNIQUE constraint failed') &&
    message.includes('document_normalized')
  );
}
