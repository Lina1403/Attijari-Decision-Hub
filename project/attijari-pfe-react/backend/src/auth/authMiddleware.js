import { sendJson } from '../utils/http.js';
import { verifyAccessToken } from './jwtUtils.js';
import { normalizeRole, hasRole } from './rbac.js';
import { sqlUserStore } from './sqlUserStore.js';
import { userStore } from './userStore.js';

async function findUserById(id) {
  if (sqlUserStore.isConfigured()) {
    return sqlUserStore.findById(id);
  }

  const jsonUser = userStore.findById(id);
  return jsonUser ? { ...jsonUser, role: normalizeRole(jsonUser.role) || jsonUser.role } : null;
}

export async function requireAuth(request, response, { requestId } = {}) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      sendJson(response, 401, {
        code: 'MISSING_TOKEN',
        message: 'Token d authentification manquant.',
        requestId,
      });
      return null;
    }

    const payload = verifyAccessToken(authHeader.slice(7));
    const user = await findUserById(payload.sub);

    if (!user) {
      sendJson(response, 401, {
        code: 'USER_NOT_FOUND',
        message: 'Utilisateur introuvable ou inactif.',
        requestId,
      });
      return null;
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: normalizeRole(user.role),
      fullName: user.fullName,
    };

    return request.user;
  } catch (error) {
    sendJson(response, 401, {
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      message: error.name === 'TokenExpiredError' ? 'Token expire.' : 'Token invalide.',
      requestId,
    });
    return null;
  }
}

export async function requireRole(request, response, allowedRoles, context = {}) {
  const user = await requireAuth(request, response, context);
  if (!user) {
    return null;
  }

  if (!hasRole(user, allowedRoles)) {
    sendJson(response, 403, {
      code: 'FORBIDDEN',
      message: 'Acces refuse pour ce role.',
      requiredRoles: allowedRoles,
      userRole: user.role,
      requestId: context.requestId,
    });
    return null;
  }

  return user;
}
