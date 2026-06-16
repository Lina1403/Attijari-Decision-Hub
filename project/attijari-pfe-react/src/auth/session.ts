function decodeBase64Url(value: string) {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return atob(padded);
  } catch {
    return null;
  }
}

export function decodeJwtPayload(token?: string | null) {
  if (!token) return null;

  const [, payload] = token.split('.');
  if (!payload) return null;

  const decoded = decodeBase64Url(payload);
  if (!decoded) return null;

  try {
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getTokenExpirationDate(token?: string | null) {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);

  if (!Number.isFinite(exp) || exp <= 0) {
    return null;
  }

  return new Date(exp * 1000);
}

export function getTokenIssuedAt(token?: string | null) {
  const payload = decodeJwtPayload(token);
  const issuedAt = Number(payload?.iat);

  if (!Number.isFinite(issuedAt) || issuedAt <= 0) {
    return null;
  }

  return new Date(issuedAt * 1000);
}
