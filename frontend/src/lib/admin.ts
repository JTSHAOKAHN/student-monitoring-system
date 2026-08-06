import { createHmac, timingSafeEqual } from 'crypto';

const adminUsername = (process.env.ADMIN_USERNAME || 'examguardian').trim().toLowerCase();
const adminPassword = process.env.ADMIN_PASSWORD || 'guardian2026';
const sessionSecret = process.env.ADMIN_SESSION_SECRET || 'development-admin-secret';

export function verifyAdminCredentials(username: string, password: string) {
  return username.trim().toLowerCase() === adminUsername && password === adminPassword;
}

export function createAdminSessionToken(username: string) {
  const payload = `${username}:${Date.now()}`;
  const signature = createHmac('sha256', sessionSecret).update(payload).digest('hex');
  return Buffer.from(`${payload}.${signature}`).toString('base64url');
}

export function verifyAdminSessionToken(token?: string) {
  if (!token) {
    return false;
  }

  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [payload, signature] = decoded.split('.');

    if (!payload || !signature) {
      return false;
    }

    const expectedSignature = createHmac('sha256', sessionSecret).update(payload).digest('hex');
    const receivedSignature = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    return receivedSignature.length === expectedBuffer.length && timingSafeEqual(receivedSignature, expectedBuffer);
  } catch {
    return false;
  }
}
