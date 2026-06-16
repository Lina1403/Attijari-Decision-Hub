import bcrypt from 'bcryptjs';
import { userStore } from './userStore.js';

const DEMO_USERS = [
  {
    email: 'admin@attijari.tn',
    password: 'Attijari2024!',
    firstName: 'Admin',
    lastName: 'Attijari',
    role: 'admin',
  },
  {
    email: 'demo@attijari.tn',
    password: 'demo123',
    firstName: 'Lina',
    lastName: 'Ben Ali',
    role: 'admin',
  },
];

export async function seedUsers(logger) {
  if (userStore.count() > 0) return;

  logger?.info('Seeding demo users...');

  for (const u of DEMO_USERS) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    userStore.createUser({
      email: u.email,
      passwordHash,
      firstName: u.firstName,
      lastName: u.lastName,
      role: u.role,
    });
    logger?.info(`Created user: ${u.email} / ${u.password}`);
  }
}
