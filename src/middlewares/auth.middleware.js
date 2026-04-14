const jwt = require('jsonwebtoken');

function extractToken(req) {
  const cookieToken = req.cookies?.token;
  const authHeader = req.headers?.authorization;
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    return authHeader.slice(7).trim();
  }
  return cookieToken;
}

function verifyToken(token) {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET is not configured');
  }
  return jwt.verify(token, process.env.JWT_SECRET);
}

async function authArtist(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = verifyToken(token);
    const role = (decoded.role || '').toString().toLowerCase();
    if (role !== 'artist') {
      return res.status(403).json({ message: 'Artist role required' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

async function authUser(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decoded = verifyToken(token);
    const role = (decoded.role || '').toString().toLowerCase();
    if (!['user', 'artist'].includes(role)) {
      return res.status(403).json({ message: 'User authentication required' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = { authArtist, authUser }