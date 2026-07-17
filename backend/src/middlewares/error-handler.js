export function notFound(req, res) {
  res.status(404).json({ error: 'Ресурс не найден.' });
}

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err);
  const status = err.status ?? 500;
  const message = status === 500 ? 'Внутренняя ошибка сервера.' : err.message;
  if (status === 500) console.error(err);
  res.status(status).json({ error: message });
}
