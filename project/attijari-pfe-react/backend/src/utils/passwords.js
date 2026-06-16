import { randomInt } from 'node:crypto';

const UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijkmnopqrstuvwxyz';
const DIGITS = '23456789';
const SYMBOLS = '@#$%*+-_';
const ALL_CHARSETS = [UPPERCASE, LOWERCASE, DIGITS, SYMBOLS];

function pickRandom(source) {
  return source[randomInt(0, source.length)];
}

export function generateTemporaryPassword(length = 12) {
  const safeLength = Math.max(length, ALL_CHARSETS.length + 2);
  const characters = ALL_CHARSETS.map((charset) => pickRandom(charset));

  while (characters.length < safeLength) {
    characters.push(pickRandom(ALL_CHARSETS[randomInt(0, ALL_CHARSETS.length)]));
  }

  for (let index = characters.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index + 1);
    const current = characters[index];
    characters[index] = characters[swapIndex];
    characters[swapIndex] = current;
  }

  return characters.join('');
}

export function splitFullName(fullName) {
  const normalized = String(fullName ?? '')
    .trim()
    .replace(/\s+/g, ' ');

  if (!normalized) {
    return {
      firstName: 'Utilisateur',
      lastName: 'Attijari',
      initials: 'UA',
    };
  }

  const [firstName, ...rest] = normalized.split(' ');
  const lastName = rest.join(' ').trim() || 'Attijari';
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  return {
    firstName,
    lastName,
    initials,
  };
}
