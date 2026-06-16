export function setCommonHeaders(response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  response.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, X-Request-Id, Authorization',
  );
}

export function sendJson(response, statusCode, payload) {
  setCommonHeaders(response);
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

export function sendNoContent(response, statusCode = 204) {
  setCommonHeaders(response);
  response.statusCode = statusCode;
  response.end();
}

export async function readJsonBody(request, { maxSizeBytes = 1_000_000 } = {}) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;

    if (size > maxSizeBytes) {
      const error = new Error('La requête dépasse la taille maximale autorisée.');
      error.code = 'REQUEST_TOO_LARGE';
      error.statusCode = 413;
      throw error;
    }

    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString('utf-8').trim();

  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    const error = new Error('Le corps de la requête doit être un JSON valide.');
    error.code = 'INVALID_JSON';
    error.statusCode = 400;
    throw error;
  }
}

export function getRequestPath(request) {
  const url = new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
  return url.pathname;
}
