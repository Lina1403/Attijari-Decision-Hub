import bcrypt from 'bcryptjs';
import { accountStore } from './accountStore.js';
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
} from './jwtUtils.js';
import { normalizeRole } from './rbac.js';
import { rateLimiter } from './rateLimiter.js';
import { sqlUserStore } from './sqlUserStore.js';
import { userStore } from './userStore.js';
import { readJsonBody, sendJson } from '../utils/http.js';
import { generateTemporaryPassword } from '../utils/passwords.js';

const SALT_ROUNDS = 10;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPACE_ROLES = {
  admin: 'ADMIN',
  marketing: 'MARKETING',
  commercial: 'COMMERCIAL',
};

function getClientIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() ??
    req.socket?.remoteAddress ??
    'unknown'
  );
}

function normalizeNamePart(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function buildFullName(firstName, lastName) {
  return `${normalizeNamePart(firstName)} ${normalizeNamePart(lastName)}`.trim();
}

function buildInitials(firstName, lastName) {
  return `${normalizeNamePart(firstName).charAt(0)}${normalizeNamePart(lastName).charAt(0)}`
    .replace(/\s/g, '')
    .toUpperCase();
}

function toPublicUser(user) {
  const firstName = normalizeNamePart(user.firstName);
  const lastName = normalizeNamePart(user.lastName);

  return {
    id: user.id,
    email: user.email,
    firstName,
    lastName,
    fullName: user.fullName || buildFullName(firstName, lastName),
    initials: user.initials || buildInitials(firstName, lastName),
    role: normalizeRole(user.role) || user.role,
    entity: user.entity || 'Attijari Bank Tunisia',
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? null,
  };
}

async function findByEmail(email) {
  if (sqlUserStore.isConfigured()) {
    return sqlUserStore.findByEmail(email);
  }

  const user = userStore.findByEmail(email);
  return user ? { ...user, source: 'json' } : null;
}

async function findByEmailIncludingInactive(email) {
  if (sqlUserStore.isConfigured()) {
    return sqlUserStore.findByEmailIncludingInactive(email);
  }

  const user = userStore.findByEmail(email);
  return user ? { ...user, source: 'json', isActive: true } : null;
}

async function findById(id) {
  if (sqlUserStore.isConfigured()) {
    return sqlUserStore.findById(id);
  }

  const user = userStore.findById(id);
  return user ? { ...user, source: 'json' } : null;
}

async function listUserRecords() {
  if (sqlUserStore.isConfigured()) {
    return sqlUserStore.listUsers();
  }

  return userStore
    .listUsers()
    .filter((user) => user.isActive !== false)
    .map((user) => ({ ...user, source: 'json' }));
}

async function deleteUserRecord(id, source = 'sql') {
  if (sqlUserStore.isConfigured() && source !== 'json') {
    await sqlUserStore.deleteUser(id);
    return;
  }

  userStore.deleteUser(id);
}

async function findByRefreshToken(refreshToken) {
  if (sqlUserStore.isConfigured()) {
    return sqlUserStore.findByRefreshToken(refreshToken);
  }

  const user = userStore.findByRefreshToken(refreshToken);
  return user ? { ...user, source: 'json' } : null;
}

async function updateRefreshToken(id, refreshToken, source = 'sql') {
  if (sqlUserStore.isConfigured() && source !== 'json') {
    await sqlUserStore.updateRefreshToken(id, refreshToken);
    return;
  }

  userStore.updateRefreshToken(id, refreshToken);
}

async function touchLastLogin(id, source = 'sql', lastLoginAt = new Date().toISOString()) {
  if (sqlUserStore.isConfigured() && source !== 'json') {
    await sqlUserStore.touchLastLogin(id, lastLoginAt);
    return;
  }

  userStore.touchLastLogin(id, lastLoginAt);
}

async function updateProfileRecord(id, payload, source = 'sql') {
  if (sqlUserStore.isConfigured() && source !== 'json') {
    await sqlUserStore.updateProfile(id, payload);
    return;
  }

  userStore.updateProfile(id, payload);
}

async function updatePasswordHashRecord(id, passwordHash, source = 'sql') {
  if (sqlUserStore.isConfigured() && source !== 'json') {
    await sqlUserStore.updatePasswordHash(id, passwordHash);
    return;
  }

  userStore.updatePasswordHash(id, passwordHash);
}

function tokenPayload(user) {
  return {
    sub: user.id,
    email: user.email,
    role: normalizeRole(user.role) || user.role,
    fullName: user.fullName || buildFullName(user.firstName, user.lastName),
  };
}

function signSessionTokens(user) {
  const payload = tokenPayload(user);
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

function buildPreferencesPayload(user) {
  return {
    preferences: accountStore.getPreferences(user.id, user),
  };
}

function buildNotificationsPayload(user) {
  const notifications = accountStore.getNotifications(user.id, user);
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  return {
    notifications,
    unreadCount,
  };
}

async function getCurrentUserFromRequest(request) {
  if (!request.user?.id) {
    return null;
  }

  return findById(request.user.id);
}

export const authController = {
  async handleLogin(request, response, { requestId }) {
    const ip = getClientIp(request);

    try {
      rateLimiter.check(ip);

      const { email, password, space } = await readJsonBody(request);
      const normalizedSpace = String(space ?? '').trim().toLowerCase();

      if (!email || !password) {
        return sendJson(response, 400, {
          code: 'MISSING_FIELDS',
          message: 'Email et mot de passe sont requis.',
        });
      }

      if (!EMAIL_REGEX.test(email)) {
        return sendJson(response, 400, {
          code: 'INVALID_EMAIL',
          message: 'Adresse e-mail invalide.',
        });
      }

      if (typeof password !== 'string' || password.length < 6) {
        return sendJson(response, 400, {
          code: 'INVALID_PASSWORD',
          message: 'Le mot de passe doit contenir au moins 6 caracteres.',
        });
      }

      const inactiveUser = await findByEmailIncludingInactive(email);
      const user = await findByEmail(email);

      if (!user) {
        if (inactiveUser && inactiveUser.isActive === false) {
          return sendJson(response, 403, {
            code: 'USER_INACTIVE',
            message: "Ce compte est inactif. Contactez l'administrateur.",
          });
        }

        rateLimiter.record(ip);
        return sendJson(response, 401, {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur non trouve. Verifiez votre adresse e-mail.',
        });
      }

      const normalizedRole = normalizeRole(user.role);
      if (!normalizedRole) {
        return sendJson(response, 403, {
          code: 'ROLE_NOT_ALLOWED',
          message: "Votre role n'est pas autorise sur cette plateforme Decision Hub.",
        });
      }

      const passwordOk = await bcrypt.compare(password, user.passwordHash);
      if (!passwordOk) {
        rateLimiter.record(ip);
        return sendJson(response, 401, {
          code: 'INVALID_PASSWORD',
          message: 'Mot de passe incorrect. Verifiez vos identifiants.',
        });
      }

      if (normalizedSpace === 'admin' && normalizedRole !== 'ADMIN') {
        return sendJson(response, 403, {
          code: 'ADMIN_SPACE_ONLY',
          message: "Cet espace est reserve aux administrateurs.",
        });
      }

      const requiredRole = SPACE_ROLES[normalizedSpace];
      if (requiredRole && normalizedRole !== requiredRole) {
        return sendJson(response, 403, {
          code: 'SPACE_ROLE_MISMATCH',
          message: "Ces identifiants ne correspondent pas a l'espace selectionne.",
        });
      }

      rateLimiter.reset(ip);

      const { accessToken, refreshToken } = signSessionTokens(user);
      const lastLoginAt = new Date().toISOString();

      await updateRefreshToken(user.id, refreshToken, user.source);
      await touchLastLogin(user.id, user.source, lastLoginAt);
      accountStore.pushNotification(
        user.id,
        {
          category: 'security',
          title: 'Connexion detectee',
          message: 'Une nouvelle connexion a votre espace a ete enregistree.',
          createdAt: lastLoginAt,
        },
        user,
      );

      user.lastLoginAt = lastLoginAt;

      return sendJson(response, 200, {
        user: toPublicUser(user),
        accessToken,
        refreshToken,
      });
    } catch (error) {
      if (error.code === 'RATE_LIMITED') {
        return sendJson(response, 429, { code: error.code, message: error.message });
      }

      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'LOGIN_ERROR',
        message: error.message ?? 'Erreur lors de la connexion.',
        requestId,
      });
    }
  },

  async handleRegister(request, response, { requestId }) {
    return sendJson(response, 403, {
      code: 'REGISTER_DISABLED',
      message:
        "La creation directe de compte est desactivee. Utilisez la demande d'acces.",
      requestId,
    });
  },

  async handleRefresh(request, response, { requestId }) {
    try {
      const { refreshToken } = await readJsonBody(request);

      if (!refreshToken) {
        return sendJson(response, 400, {
          code: 'MISSING_TOKEN',
          message: 'Refresh token manquant.',
        });
      }

      verifyRefreshToken(refreshToken);

      const user = await findByRefreshToken(refreshToken);
      if (!user) {
        return sendJson(response, 401, {
          code: 'INVALID_REFRESH_TOKEN',
          message: 'Session expirée. Veuillez vous reconnecter.',
        });
      }

      const tokens = signSessionTokens(user);
      await updateRefreshToken(user.id, tokens.refreshToken, user.source);

      return sendJson(response, 200, tokens);
    } catch (error) {
      if (error.name === 'TokenExpiredError' || error.name === 'JsonWebTokenError') {
        return sendJson(response, 401, {
          code: 'EXPIRED_REFRESH_TOKEN',
          message: 'Session expirée. Veuillez vous reconnecter.',
        });
      }

      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'REFRESH_ERROR',
        message: error.message ?? 'Erreur lors du rafraîchissement de la session.',
        requestId,
      });
    }
  },

  async handleLogout(request, response) {
    try {
      const { refreshToken } = await readJsonBody(request);
      if (refreshToken) {
        const user = await findByRefreshToken(refreshToken);
        if (user) {
          await updateRefreshToken(user.id, null, user.source);
        }
      }
    } catch {
      // Always succeed
    }

    return sendJson(response, 200, { success: true, message: 'Déconnexion réussie.' });
  },

  async handleMe(request, response, { requestId }) {
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        return sendJson(response, 401, {
          code: 'MISSING_TOKEN',
          message: "Token d'authentification manquant.",
        });
      }

      const token = authHeader.slice(7);
      const payload = verifyAccessToken(token);
      const user = await findById(payload.sub);

      if (!user) {
        return sendJson(response, 401, {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable.',
        });
      }

      return sendJson(response, 200, { user: toPublicUser(user) });
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        return sendJson(response, 401, {
          code: 'TOKEN_EXPIRED',
          message: 'Token expiré.',
        });
      }

      if (error.name === 'JsonWebTokenError') {
        return sendJson(response, 401, {
          code: 'INVALID_TOKEN',
          message: 'Token invalide.',
        });
      }

      return sendJson(response, 500, {
        code: 'ME_ERROR',
        message: error.message ?? 'Erreur interne.',
        requestId,
      });
    }
  },

  async handleGetProfile(request, response, { requestId }) {
    try {
      const user = await getCurrentUserFromRequest(request);

      if (!user) {
        return sendJson(response, 404, {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable.',
        });
      }

      return sendJson(response, 200, { user: toPublicUser(user) });
    } catch (error) {
      return sendJson(response, 500, {
        code: 'PROFILE_READ_ERROR',
        message: error.message ?? 'Erreur lors de la lecture du profil.',
        requestId,
      });
    }
  },

  async handleUpdateProfile(request, response, { requestId }) {
    try {
      const currentUser = await getCurrentUserFromRequest(request);

      if (!currentUser) {
        return sendJson(response, 404, {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable.',
        });
      }

      const { firstName, lastName, email, entity } = await readJsonBody(request);
      const normalizedFirstName = normalizeNamePart(firstName);
      const normalizedLastName = normalizeNamePart(lastName);
      const normalizedEmail = String(email ?? '')
        .trim()
        .toLowerCase();
      const normalizedEntity = normalizeNamePart(entity) || 'Attijari Bank Tunisia';

      if (!normalizedFirstName || !normalizedLastName || !normalizedEmail) {
        return sendJson(response, 400, {
          code: 'MISSING_FIELDS',
          message: 'Prénom, nom et email sont requis.',
        });
      }

      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return sendJson(response, 400, {
          code: 'INVALID_EMAIL',
          message: 'Adresse e-mail invalide.',
        });
      }

      const existingUser = await findByEmailIncludingInactive(normalizedEmail);
      if (existingUser && existingUser.id !== currentUser.id) {
        return sendJson(response, 409, {
          code: 'EMAIL_TAKEN',
          message: 'Cette adresse e-mail est déjà utilisée.',
        });
      }

      await updateProfileRecord(
        currentUser.id,
        {
          email: normalizedEmail,
          firstName: normalizedFirstName,
          lastName: normalizedLastName,
          entity: normalizedEntity,
        },
        currentUser.source,
      );

      const updatedUser = await findById(currentUser.id);
      if (!updatedUser) {
        throw new Error('Utilisateur introuvable après mise à jour du profil.');
      }

      const tokens = signSessionTokens(updatedUser);
      await updateRefreshToken(updatedUser.id, tokens.refreshToken, updatedUser.source);

      accountStore.pushNotification(
        updatedUser.id,
        {
          category: 'profile',
          title: 'Profil mis à jour',
          message: 'Vos informations de profil ont été enregistrées avec succès.',
        },
        updatedUser,
      );

      return sendJson(response, 200, {
        message: 'Profil mis à jour.',
        user: toPublicUser(updatedUser),
        ...tokens,
      });
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'PROFILE_UPDATE_ERROR',
        message: error.message ?? 'Erreur lors de la mise à jour du profil.',
        requestId,
      });
    }
  },

  async handleGetPreferences(request, response, { requestId }) {
    try {
      const user = await getCurrentUserFromRequest(request);

      if (!user) {
        return sendJson(response, 404, {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable.',
        });
      }

      return sendJson(response, 200, buildPreferencesPayload(user));
    } catch (error) {
      return sendJson(response, 500, {
        code: 'PREFERENCES_READ_ERROR',
        message: error.message ?? 'Erreur lors de la lecture des préférences.',
        requestId,
      });
    }
  },

  async handleUpdatePreferences(request, response, { requestId }) {
    try {
      const user = await getCurrentUserFromRequest(request);

      if (!user) {
        return sendJson(response, 404, {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable.',
        });
      }

      const { language, theme, contentDensity, notifications } = await readJsonBody(request);

      if (language && language !== 'fr') {
        return sendJson(response, 400, {
          code: 'INVALID_LANGUAGE',
          message: 'La langue disponible pour le moment est uniquement le français.',
        });
      }

      if (theme && !['light', 'dark'].includes(theme)) {
        return sendJson(response, 400, {
          code: 'INVALID_THEME',
          message: 'Le thème doit être light ou dark.',
        });
      }

      if (contentDensity && !['comfortable', 'compact'].includes(contentDensity)) {
        return sendJson(response, 400, {
          code: 'INVALID_DENSITY',
          message: 'La densité doit être comfortable ou compact.',
        });
      }

      const preferences = accountStore.updatePreferences(
        user.id,
        {
          language,
          theme,
          contentDensity,
          notifications,
        },
        user,
      );

      accountStore.pushNotification(
        user.id,
        {
          category: 'system',
          title: 'Préférences mises à jour',
          message: 'Vos préférences d’interface et de notifications ont été enregistrées.',
        },
        user,
      );

      return sendJson(response, 200, {
        message: 'Préférences enregistrées.',
        preferences,
      });
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'PREFERENCES_UPDATE_ERROR',
        message: error.message ?? 'Erreur lors de la mise à jour des préférences.',
        requestId,
      });
    }
  },

  async handleGetNotifications(request, response, { requestId }) {
    try {
      const user = await getCurrentUserFromRequest(request);

      if (!user) {
        return sendJson(response, 404, {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable.',
        });
      }

      return sendJson(response, 200, buildNotificationsPayload(user));
    } catch (error) {
      return sendJson(response, 500, {
        code: 'NOTIFICATIONS_READ_ERROR',
        message: error.message ?? 'Erreur lors de la lecture des notifications.',
        requestId,
      });
    }
  },

  async handleMarkNotificationsRead(request, response, { requestId }) {
    try {
      const user = await getCurrentUserFromRequest(request);

      if (!user) {
        return sendJson(response, 404, {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable.',
        });
      }

      const { ids = [], all = false } = await readJsonBody(request);
      accountStore.markNotificationsRead(user.id, { ids, all }, user);

      return sendJson(response, 200, buildNotificationsPayload(user));
    } catch (error) {
      return sendJson(response, 500, {
        code: 'NOTIFICATIONS_UPDATE_ERROR',
        message: error.message ?? 'Erreur lors de la mise à jour des notifications.',
        requestId,
      });
    }
  },

  async handleClearReadNotifications(request, response, { requestId }) {
    try {
      const user = await getCurrentUserFromRequest(request);

      if (!user) {
        return sendJson(response, 404, {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable.',
        });
      }

      accountStore.clearReadNotifications(user.id, user);

      return sendJson(response, 200, buildNotificationsPayload(user));
    } catch (error) {
      return sendJson(response, 500, {
        code: 'NOTIFICATIONS_CLEAR_ERROR',
        message: error.message ?? 'Erreur lors de la suppression des notifications lues.',
        requestId,
      });
    }
  },

  async handleChangePassword(request, response, { requestId }) {
    try {
      const user = await getCurrentUserFromRequest(request);

      if (!user) {
        return sendJson(response, 404, {
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur introuvable.',
        });
      }

      const { currentPassword, newPassword } = await readJsonBody(request);

      if (!currentPassword || !newPassword) {
        return sendJson(response, 400, {
          code: 'MISSING_FIELDS',
          message: 'Mot de passe actuel et nouveau mot de passe sont requis.',
        });
      }

      if (String(newPassword).length < 6) {
        return sendJson(response, 400, {
          code: 'WEAK_PASSWORD',
          message: 'Le nouveau mot de passe doit contenir au moins 6 caractères.',
        });
      }

      const passwordOk = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!passwordOk) {
        return sendJson(response, 401, {
          code: 'INVALID_PASSWORD',
          message: 'Le mot de passe actuel est incorrect.',
        });
      }

      if (currentPassword === newPassword) {
        return sendJson(response, 400, {
          code: 'SAME_PASSWORD',
          message: 'Le nouveau mot de passe doit être différent de l’ancien.',
        });
      }

      const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
      await updatePasswordHashRecord(user.id, passwordHash, user.source);

      const updatedUser = await findById(user.id);
      if (!updatedUser) {
        throw new Error('Utilisateur introuvable après mise à jour du mot de passe.');
      }

      const tokens = signSessionTokens(updatedUser);
      await updateRefreshToken(updatedUser.id, tokens.refreshToken, updatedUser.source);

      accountStore.pushNotification(
        updatedUser.id,
        {
          category: 'security',
          title: 'Mot de passe modifié',
          message: 'Votre mot de passe a été changé avec succès.',
        },
        updatedUser,
      );

      return sendJson(response, 200, {
        message: 'Mot de passe mis à jour.',
        ...tokens,
      });
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'PASSWORD_CHANGE_ERROR',
        message: error.message ?? 'Erreur lors du changement de mot de passe.',
        requestId,
      });
    }
  },

  async handleListUsers(request, response, { requestId }) {
    try {
      const currentUserId = request.user?.id;
      const users = await listUserRecords();

      return sendJson(response, 200, {
        users: users.map((user) => ({
          ...toPublicUser(user),
          canDelete: user.id !== currentUserId,
        })),
      });
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'USERS_LIST_ERROR',
        message: error.message ?? 'Erreur lors de la lecture des comptes.',
        requestId,
      });
    }
  },

  async handleDeleteUser(request, response, { requestId }) {
    try {
      const targetUserId = request.params?.userId;

      if (!targetUserId) {
        return sendJson(response, 400, {
          code: 'MISSING_USER_ID',
          message: 'Identifiant utilisateur requis.',
        });
      }

      if (targetUserId === request.user?.id) {
        return sendJson(response, 400, {
          code: 'SELF_DELETE_FORBIDDEN',
          message: 'Vous ne pouvez pas supprimer votre propre compte administrateur.',
        });
      }

      const targetUser = await findById(targetUserId);
      if (!targetUser) {
        return sendJson(response, 404, {
          code: 'USER_NOT_FOUND',
          message: 'Compte introuvable ou deja supprime.',
        });
      }

      await deleteUserRecord(targetUser.id, targetUser.source);

      accountStore.pushNotification(
        request.user.id,
        {
          category: 'security',
          title: 'Compte supprime',
          message: `${targetUser.fullName || targetUser.email} ne peut plus se connecter.`,
        },
        request.user,
      );

      return sendJson(response, 200, {
        message: 'Compte supprime avec succes.',
        user: toPublicUser(targetUser),
      });
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'USER_DELETE_ERROR',
        message: error.message ?? 'Erreur lors de la suppression du compte.',
        requestId,
      });
    }
  },

  async handleForgotPassword(request, response, { requestId, emailService }) {
    try {
      const { email } = await readJsonBody(request);
      const normalizedEmail = String(email ?? '')
        .trim()
        .toLowerCase();

      if (!normalizedEmail) {
        return sendJson(response, 400, {
          code: 'MISSING_EMAIL',
          message: 'Adresse e-mail requise.',
        });
      }

      if (!EMAIL_REGEX.test(normalizedEmail)) {
        return sendJson(response, 400, {
          code: 'INVALID_EMAIL',
          message: 'Adresse e-mail invalide.',
        });
      }

      const inactiveUser = await findByEmailIncludingInactive(normalizedEmail);
      const user = await findByEmail(normalizedEmail);

      if (!user) {
        if (inactiveUser && inactiveUser.isActive === false) {
          return sendJson(response, 403, {
            code: 'USER_INACTIVE',
            message: "Ce compte est inactif. Contactez l'administrateur.",
          });
        }

        return sendJson(response, 404, {
          code: 'USER_NOT_FOUND',
          message: 'Aucun compte actif ne correspond a cette adresse e-mail.',
        });
      }

      const temporaryPassword = generateTemporaryPassword();
      const passwordHash = await bcrypt.hash(temporaryPassword, SALT_ROUNDS);
      await updatePasswordHashRecord(user.id, passwordHash, user.source);
      await updateRefreshToken(user.id, null, user.source);

      const emailResult = await emailService.sendPasswordResetEmail({
        fullName: user.fullName || buildFullName(user.firstName, user.lastName),
        email: user.email,
        temporaryPassword,
      });

      accountStore.pushNotification(
        user.id,
        {
          category: 'security',
          title: 'Mot de passe reinitialise',
          message: 'Un mot de passe temporaire a ete genere pour votre compte.',
        },
        user,
      );

      return sendJson(response, 200, {
        message:
          emailResult.delivered
            ? 'Un mot de passe temporaire a ete envoye par e-mail.'
            : 'Un mot de passe temporaire a ete genere. Configurez SMTP pour activer l envoi e-mail.',
        deliveryMode: emailResult.mode,
        delivered: emailResult.delivered,
        credentialsPreview: emailResult.delivered
          ? undefined
          : {
              email: user.email,
              temporaryPassword,
            },
      });
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        code: error.code ?? 'PASSWORD_RESET_ERROR',
        message: error.message ?? 'Erreur lors de la reinitialisation du mot de passe.',
        requestId,
      });
    }
  },
};
