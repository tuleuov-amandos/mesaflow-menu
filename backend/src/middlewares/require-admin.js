import jwt from 'jsonwebtoken';

export function requireAdmin(req, res, next) {
  const secret = process.env.ADMIN_JWT_SECRET;
  if (!secret) {
    return res.status(503).json({ error: 'Панель администрирования недоступна.' });
  }

  const header = req.headers.authorization ?? '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Не авторизован.' });
  }

  try {
    const payload = jwt.verify(token, secret);
    if (payload.role !== 'admin') {
      return res.status(401).json({ error: 'Не авторизован.' });
    }
    req.admin = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Сессия истекла или недействительна.' });
  }
}
