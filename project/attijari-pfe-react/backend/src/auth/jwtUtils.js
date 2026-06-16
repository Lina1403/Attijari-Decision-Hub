import jwt from 'jsonwebtoken';

const ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? 'attijari-access-secret-please-change-in-production';
const REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? 'attijari-refresh-secret-please-change-in-production';

export function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '1h' });
}

export function signRefreshToken(payload) {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}
