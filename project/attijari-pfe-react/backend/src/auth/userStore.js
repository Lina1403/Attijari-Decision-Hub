import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const USERS_FILE = join(__dirname, '../../data/users.json');

function stripUtf8Bom(content) {
  return String(content ?? '').replace(/^\uFEFF/u, '');
}

function readUsers() {
  if (!existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(stripUtf8Bom(readFileSync(USERS_FILE, 'utf-8')));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

export const userStore = {
  listUsers() {
    return readUsers();
  },

  findByEmail(email) {
    return (
      readUsers().find(
        (u) => u.email === email.trim().toLowerCase() && u.isActive !== false,
      ) ?? null
    );
  },

  findById(id) {
    return readUsers().find((u) => u.id === id && u.isActive !== false) ?? null;
  },

  findByRefreshToken(token) {
    return readUsers().find((u) => u.refreshToken === token && u.isActive !== false) ?? null;
  },

  createUser({ email, passwordHash, firstName, lastName, role = 'admin' }) {
    const users = readUsers();
    const normalized = email.trim().toLowerCase();

    if (users.find((u) => u.email === normalized)) {
      const err = new Error('Un compte avec cet email existe déjà.');
      err.code = 'EMAIL_TAKEN';
      err.statusCode = 409;
      throw err;
    }

    const user = {
      id: randomUUID(),
      email: normalized,
      passwordHash,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      fullName: `${firstName.trim()} ${lastName.trim()}`,
      initials: `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase(),
      role,
      entity: 'Attijari Bank Tunisia',
      refreshToken: null,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    };

    users.push(user);
    writeUsers(users);
    return { ...user, source: 'json' };
  },

  updateRefreshToken(id, refreshToken) {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return;
    users[idx].refreshToken = refreshToken;
    writeUsers(users);
  },

  updateProfile(id, { email, firstName, lastName, entity }) {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    const nextFirstName = String(firstName ?? users[idx].firstName).trim();
    const nextLastName = String(lastName ?? users[idx].lastName).trim();
    const nextEmail = String(email ?? users[idx].email).trim().toLowerCase();
    const nextEntity = String(entity ?? users[idx].entity ?? 'Attijari Bank Tunisia').trim();

    users[idx] = {
      ...users[idx],
      email: nextEmail,
      firstName: nextFirstName,
      lastName: nextLastName,
      fullName: `${nextFirstName} ${nextLastName}`.trim(),
      initials: `${nextFirstName.charAt(0)}${nextLastName.charAt(0)}`.toUpperCase(),
      entity: nextEntity || 'Attijari Bank Tunisia',
    };

    writeUsers(users);
    return users[idx];
  },

  updatePasswordHash(id, passwordHash) {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    users[idx].passwordHash = passwordHash;
    writeUsers(users);
    return users[idx];
  },

  touchLastLogin(id, lastLoginAt = new Date().toISOString()) {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return;
    users[idx].lastLoginAt = lastLoginAt;
    writeUsers(users);
  },

  deleteUser(id) {
    const users = readUsers();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    const deletedUser = users[idx];
    users.splice(idx, 1);
    writeUsers(users);
    return deletedUser;
  },

  count() {
    return readUsers().length;
  },
};
