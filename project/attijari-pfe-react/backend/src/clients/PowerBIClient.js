function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

async function readResponseDetails(response) {
  try {
    const payload = await response.json();

    if (typeof payload?.error?.message === 'string' && payload.error.message.trim()) {
      return payload.error.message.trim();
    }

    if (typeof payload?.message === 'string' && payload.message.trim()) {
      return payload.message.trim();
    }

    return JSON.stringify(payload);
  } catch {
    try {
      const text = await response.text();
      return text.trim();
    } catch {
      return '';
    }
  }
}

async function parseJsonResponse(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildDetailsSuffix(details) {
  return details ? ` ${details}` : '';
}

export class PowerBIConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PowerBIConfigurationError';
    this.code = 'POWERBI_CONFIG_ERROR';
    this.statusCode = 500;
  }
}

export class PowerBIAuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PowerBIAuthenticationError';
    this.code = 'POWERBI_AUTH_ERROR';
    this.statusCode = 502;
  }
}

export class PowerBIAccessDeniedError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PowerBIAccessDeniedError';
    this.code = 'POWERBI_ACCESS_DENIED';
    this.statusCode = 403;
  }
}

export class PowerBINotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PowerBINotFoundError';
    this.code = 'POWERBI_NOT_FOUND';
    this.statusCode = 404;
  }
}

export class PowerBIUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PowerBIUnavailableError';
    this.code = 'POWERBI_UNAVAILABLE';
    this.statusCode = 503;
  }
}

export class PowerBIRequestError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PowerBIRequestError';
    this.code = 'POWERBI_REQUEST_FAILED';
    this.statusCode = 502;
  }
}

export class PowerBIClient {
  constructor({
    tenantId,
    clientId,
    clientSecret,
    workspaceId,
    authorityBaseUrl,
    apiBaseUrl,
    scope,
    timeoutMs,
  }) {
    this.tenantId = tenantId;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.workspaceId = workspaceId;
    this.authorityBaseUrl = authorityBaseUrl.replace(/\/$/, '');
    this.apiBaseUrl = apiBaseUrl.replace(/\/$/, '');
    this.scope = scope;
    this.timeoutMs = timeoutMs;
    this.tokenCache = null;
  }

  async fetchJson(url, { method = 'GET', headers = {}, body } = {}) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;

    try {
      response = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error?.name === 'AbortError') {
        throw new PowerBIUnavailableError(
          'Le service Power BI ou Microsoft Entra a depasse le delai de reponse.',
        );
      }

      throw new PowerBIUnavailableError(
        'Le service Power BI ou Microsoft Entra est actuellement inaccessible.',
      );
    }

    clearTimeout(timeoutId);

    return response;
  }

  async getAppAccessToken({ tenantId } = {}) {
    const resolvedTenantId = tenantId || this.tenantId;

    if (!resolvedTenantId || !this.clientId || !this.clientSecret) {
      const missingKeys = [
        !resolvedTenantId ? 'POWERBI_TENANT_ID (ou ctid dans l URL d embed)' : null,
        !this.clientId ? 'POWERBI_CLIENT_ID' : null,
        !this.clientSecret ? 'POWERBI_CLIENT_SECRET' : null,
      ].filter(Boolean);

      throw new PowerBIConfigurationError(
        `La configuration Power BI Embedded est incomplete. Verifiez ${missingKeys.join(', ')}.`,
      );
    }

    if (
      this.tokenCache &&
      this.tokenCache.tenantId === resolvedTenantId &&
      this.tokenCache.expiresAt > Date.now() + 60_000
    ) {
      return this.tokenCache.accessToken;
    }

    const response = await this.fetchJson(
      `${this.authorityBaseUrl}/${resolvedTenantId}/oauth2/v2.0/token`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'client_credentials',
          scope: this.scope,
        }),
      },
    );

    if (!response.ok) {
      const details = await readResponseDetails(response);

      throw new PowerBIAuthenticationError(
        `Impossible d obtenir un jeton Power BI avec le service principal.${buildDetailsSuffix(
          details,
        )}`.trim(),
      );
    }

    const payload = await parseJsonResponse(response);
    const accessToken = payload?.access_token;
    const expiresIn = Number(payload?.expires_in ?? 0);

    if (typeof accessToken !== 'string' || !accessToken.trim()) {
      throw new PowerBIAuthenticationError(
        'Microsoft Entra n a pas renvoye de jeton d acces exploitable pour Power BI.',
      );
    }

    this.tokenCache = {
      tenantId: resolvedTenantId,
      accessToken,
      expiresAt: Date.now() + Math.max(expiresIn - 120, 60) * 1000,
    };

    return accessToken;
  }

  async requestPowerBi(path, { method = 'GET', body, tenantId } = {}) {
    const accessToken = await this.getAppAccessToken({ tenantId });
    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
    }

    const response = await this.fetchJson(`${this.apiBaseUrl}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    if (!response.ok) {
      const details = await readResponseDetails(response);

      if (response.status === 401) {
        throw new PowerBIAuthenticationError(
          `Power BI a refuse le jeton d acces du service principal.${buildDetailsSuffix(
            details,
          )}`.trim(),
        );
      }

      if (response.status === 403) {
        throw new PowerBIAccessDeniedError(
          `Le service principal n a pas acces au contenu Power BI demande.${buildDetailsSuffix(
            details,
          )}`.trim(),
        );
      }

      if (response.status === 404) {
        throw new PowerBINotFoundError(
          `Le report Power BI demande est introuvable.${buildDetailsSuffix(details)}`.trim(),
        );
      }

      if (response.status >= 500) {
        throw new PowerBIUnavailableError(
          `Power BI est temporairement indisponible.${buildDetailsSuffix(details)}`.trim(),
        );
      }

      throw new PowerBIRequestError(
        `La requete Power BI a echoue.${buildDetailsSuffix(details)}`.trim(),
      );
    }

    return parseJsonResponse(response);
  }

  async getReportMetadata({ reportId, workspaceId, tenantId } = {}) {
    const resolvedWorkspaceId = workspaceId || this.workspaceId || undefined;
    const path = resolvedWorkspaceId
      ? `/groups/${resolvedWorkspaceId}/reports/${reportId}`
      : `/reports/${reportId}`;

    return this.requestPowerBi(path, { tenantId });
  }

  async generateEmbedToken({ reportId, datasetId, tenantId, lifetimeInMinutes } = {}) {
    const body = {
      reports: [{ id: reportId }],
    };

    if (datasetId) {
      body.datasets = [{ id: datasetId }];
    }

    if (Number.isFinite(lifetimeInMinutes) && lifetimeInMinutes > 0) {
      body.lifetimeInMinutes = lifetimeInMinutes;
    }

    const payload = await this.requestPowerBi('/GenerateToken', {
      method: 'POST',
      body,
      tenantId,
    });

    if (!isPlainObject(payload) || typeof payload.token !== 'string' || !payload.token.trim()) {
      throw new PowerBIRequestError(
        'Power BI n a pas renvoye de jeton d embed exploitable.',
      );
    }

    return payload;
  }
}
