type EnvValue = string | undefined;

const runtimeEnv =
  typeof process !== 'undefined'
    ? (process.env as Record<string, EnvValue>)
    : {};

function readEnv(key: string): string {
  const value = import.meta.env[key] ?? runtimeEnv[key] ?? '';
  return typeof value === 'string' ? value : '';
}

const BASE =
  readEnv('VITE_POWERBI_BASE') || readEnv('NEXT_PUBLIC_POWERBI_BASE');
const PARAMS =
  readEnv('VITE_POWERBI_PARAMS') || readEnv('NEXT_PUBLIC_POWERBI_PARAMS');

function normalizeParams(params: string): string {
  if (!params) {
    return '';
  }

  if (params.startsWith('&') || params.startsWith('?')) {
    return params.slice(1);
  }

  return params;
}

export function buildPowerBIPageUrl(pageName: string): string {
  if (!BASE) {
    return '';
  }

  try {
    const parsedUrl = new URL(BASE);
    const searchParams = new URLSearchParams(normalizeParams(PARAMS));

    if (pageName) {
      parsedUrl.searchParams.set('pageName', pageName);
    }

    searchParams.forEach((value, key) => {
      parsedUrl.searchParams.set(key, value);
    });

    return parsedUrl.toString();
  } catch {
    const encodedPageName = pageName ? `&pageName=${encodeURIComponent(pageName)}` : '';
    const params = PARAMS || '';

    return `${BASE}${encodedPageName}${params}`;
  }
}

function url(pageEnvKey: string): string {
  const page =
    readEnv(`VITE_POWERBI_PAGE_${pageEnvKey}`) ||
    readEnv(`NEXT_PUBLIC_POWERBI_PAGE_${pageEnvKey}`);

  return buildPowerBIPageUrl(page);
}

export const POWERBI_URLS = {
  global: url('GLOBAL'),
  clients: url('CLIENTS'),
  campagnes: url('CAMPAGNES'),
  google: url('GOOGLE'),
  meta: url('META'),
  reclamations: url('RECLAMATIONS'),
  agences: url('AGENCES'),
  social: url('SOCIAL'),
};
