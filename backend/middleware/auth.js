import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'apexvest_jwt_fallback_secret_key_2026';

export default function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No authentication token provided.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId; // attach user ID to request
    next();
  } catch (error) {
    console.warn('[AUTH] Token verification failed:', error.message);
    return res.status(401).json({ error: 'Access denied. Invalid or expired token.' });
  }
}
