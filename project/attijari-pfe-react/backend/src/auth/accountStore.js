import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ACCOUNT_SETTINGS_FILE = join(__dirname, '../../data/account-settings.json');
const MAX_NOTIFICATIONS = 8;
const READ_RETENTION_MS = 24 * 60 * 60 * 1000;
const DUPLICATE_WINDOW_MS = 10 * 60 * 1000;

function stripUtf8Bom(content) {
  return String(content ?? '').replace(/^\uFEFF/u, '');
}

function readAccountMap() {
  if (!existsSync(ACCOUNT_SETTINGS_FILE)) {
    return {};
  }

  try {
    return JSON.parse(stripUtf8Bom(readFileSync(ACCOUNT_SETTINGS_FILE, 'utf-8')));
  } catch {
    return {};
  }
}

function writeAccountMap(accountMap) {
  writeFileSync(ACCOUNT_SETTINGS_FILE, JSON.stringify(accountMap, null, 2), 'utf-8');
}

function buildDefaultPreferences() {
  return {
    language: 'fr',
    theme: 'light',
    contentDensity: 'comfortable',
    notifications: {
      emailEnabled: true,
      inAppEnabled: true,
      weeklyDigest: false,
      churnAlerts: true,
      marketingAlerts: true,
    },
  };
}

function buildWelcomeNotifications(user = null) {
  const fullName = user?.fullName || 'Utilisateur';
  const createdAt = new Date().toISOString();

  return [
    {
      id: randomUUID(),
      category: 'system',
      title: 'Bienvenue dans votre espace',
      message: `${fullName}, votre espace personnel est pret a etre utilise.`,
      createdAt,
      readAt: null,
    },
    {
      id: randomUUID(),
      category: 'security',
      title: 'Session securisee',
      message: 'Vos actions de securite et vos preferences sont maintenant suivies ici.',
      createdAt,
      readAt: null,
    },
  ];
}

function repairText(value) {
  const text = String(value ?? '');

  if (!/[ÃÂâ€™]/.test(text)) {
    return text;
  }

  try {
    return Buffer.from(text, 'latin1').toString('utf8');
  } catch {
    return text;
  }
}

function normalizeNotification(notification) {
  return {
    id: notification.id || randomUUID(),
    category: notification.category || 'system',
    title: repairText(notification.title || 'Notification'),
    message: repairText(notification.message || ''),
    createdAt: notification.createdAt || new Date().toISOString(),
    readAt: notification.readAt || null,
  };
}

function shouldKeepReadNotification(notification, nowMs) {
  if (!notification.readAt) {
    return true;
  }

  const readAtMs = new Date(notification.readAt).getTime();
  if (!Number.isFinite(readAtMs)) {
    return true;
  }

  return nowMs - readAtMs <= READ_RETENTION_MS;
}

function isDuplicateNotification(previous, current) {
  if (
    previous.category !== current.category ||
    previous.title !== current.title ||
    previous.message !== current.message
  ) {
    return false;
  }

  const previousMs = new Date(previous.createdAt).getTime();
  const currentMs = new Date(current.createdAt).getTime();

  if (!Number.isFinite(previousMs) || !Number.isFinite(currentMs)) {
    return false;
  }

  return Math.abs(previousMs - currentMs) <= DUPLICATE_WINDOW_MS;
}

function normalizeNotifications(notifications) {
  if (!Array.isArray(notifications)) {
    return [];
  }

  const nowMs = Date.now();
  const normalized = notifications
    .filter(Boolean)
    .map(normalizeNotification)
    .filter(shouldStoreNotification)
    .filter((notification) => shouldKeepReadNotification(notification, nowMs))
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

  const deduped = [];

  normalized.forEach((notification) => {
    const alreadyPresent = deduped.some((existing) => isDuplicateNotification(existing, notification));
    if (!alreadyPresent) {
      deduped.push(notification);
    }
  });

  return deduped.slice(0, MAX_NOTIFICATIONS);
}

function normalizePreferences(preferences = {}) {
  const defaults = buildDefaultPreferences();

  return {
    language: preferences.language === 'fr' ? 'fr' : defaults.language,
    theme: preferences.theme === 'dark' ? 'dark' : 'light',
    contentDensity: preferences.contentDensity === 'compact' ? 'compact' : 'comfortable',
    notifications: {
      emailEnabled:
        typeof preferences.notifications?.emailEnabled === 'boolean'
          ? preferences.notifications.emailEnabled
          : defaults.notifications.emailEnabled,
      inAppEnabled:
        typeof preferences.notifications?.inAppEnabled === 'boolean'
          ? preferences.notifications.inAppEnabled
          : defaults.notifications.inAppEnabled,
      weeklyDigest:
        typeof preferences.notifications?.weeklyDigest === 'boolean'
          ? preferences.notifications.weeklyDigest
          : defaults.notifications.weeklyDigest,
      churnAlerts:
        typeof preferences.notifications?.churnAlerts === 'boolean'
          ? preferences.notifications.churnAlerts
          : defaults.notifications.churnAlerts,
      marketingAlerts:
        typeof preferences.notifications?.marketingAlerts === 'boolean'
          ? preferences.notifications.marketingAlerts
          : defaults.notifications.marketingAlerts,
    },
  };
}

function ensureAccountEntry(accountMap, userId, user = null) {
  const existing = accountMap[userId] ?? {};
  const nextEntry = {
    preferences: normalizePreferences(existing.preferences),
    notifications: normalizeNotifications(
      existing.notifications?.length ? existing.notifications : buildWelcomeNotifications(user),
    ),
  };

  accountMap[userId] = nextEntry;
  return nextEntry;
}

function mergePreferences(currentPreferences, nextPreferences = {}) {
  return normalizePreferences({
    ...currentPreferences,
    ...nextPreferences,
    notifications: {
      ...(currentPreferences?.notifications ?? {}),
      ...(nextPreferences.notifications ?? {}),
    },
  });
}

function prependNotification(notifications, notification) {
  return normalizeNotifications([notification, ...notifications]);
}

function shouldStoreNotification(notification = {}) {
  const title = repairText(notification.title || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase();

  return !(
    notification.category === 'profile' ||
    title.includes('connexion detectee') ||
    title.includes('preferences mises a jour')
  );
}

export const accountStore = {
  getAccount(userId, user = null) {
    const accountMap = readAccountMap();
    const account = ensureAccountEntry(accountMap, userId, user);
    writeAccountMap(accountMap);
    return account;
  },

  getPreferences(userId, user = null) {
    return this.getAccount(userId, user).preferences;
  },

  updatePreferences(userId, nextPreferences, user = null) {
    const accountMap = readAccountMap();
    const account = ensureAccountEntry(accountMap, userId, user);
    account.preferences = mergePreferences(account.preferences, nextPreferences);
    accountMap[userId] = account;
    writeAccountMap(accountMap);
    return account.preferences;
  },

  getNotifications(userId, user = null) {
    return this.getAccount(userId, user).notifications;
  },

  pushNotification(userId, notification, user = null) {
    const accountMap = readAccountMap();
    const account = ensureAccountEntry(accountMap, userId, user);

    if (!shouldStoreNotification(notification)) {
      accountMap[userId] = account;
      writeAccountMap(accountMap);
      return account.notifications;
    }

    account.notifications = prependNotification(account.notifications, {
      id: randomUUID(),
      category: notification.category || 'system',
      title: notification.title || 'Notification',
      message: notification.message || '',
      createdAt: notification.createdAt || new Date().toISOString(),
      readAt: null,
    });
    accountMap[userId] = account;
    writeAccountMap(accountMap);
    return account.notifications;
  },

  markNotificationsRead(userId, { ids = [], all = false } = {}, user = null) {
    const accountMap = readAccountMap();
    const account = ensureAccountEntry(accountMap, userId, user);
    const idsSet = new Set(Array.isArray(ids) ? ids : []);
    const readAt = new Date().toISOString();

    account.notifications = normalizeNotifications(
      account.notifications.map((notification) => {
        if (notification.readAt) {
          return notification;
        }

        if (all || idsSet.has(notification.id)) {
          return { ...notification, readAt };
        }

        return notification;
      }),
    );

    accountMap[userId] = account;
    writeAccountMap(accountMap);
    return account.notifications;
  },

  clearReadNotifications(userId, user = null) {
    const accountMap = readAccountMap();
    const account = ensureAccountEntry(accountMap, userId, user);
    account.notifications = normalizeNotifications(
      account.notifications.filter((notification) => !notification.readAt),
    );
    accountMap[userId] = account;
    writeAccountMap(accountMap);
    return account.notifications;
  },
};
