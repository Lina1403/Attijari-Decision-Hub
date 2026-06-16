function extractJsonObject(rawText) {
  const trimmed = String(rawText ?? '').trim();

  if (!trimmed) {
    throw new GroqResponseEmptyError('Groq returned an empty response.');
  }

  try {
    return JSON.parse(trimmed);
  } catch {
    const firstBraceIndex = trimmed.indexOf('{');
    const lastBraceIndex = trimmed.lastIndexOf('}');

    if (firstBraceIndex === -1 || lastBraceIndex === -1 || lastBraceIndex <= firstBraceIndex) {
      throw new GroqInvalidResponseError(
        'The Groq response is not a usable JSON object.',
      );
    }

    try {
      return JSON.parse(trimmed.slice(firstBraceIndex, lastBraceIndex + 1));
    } catch {
      throw new GroqInvalidResponseError(
        'The Groq response is not valid JSON.',
      );
    }
  }
}

async function readErrorDetails(response) {
  try {
    const payload = await response.json();

    if (typeof payload?.error?.message === 'string' && payload.error.message.trim()) {
      return payload.error.message.trim();
    }

    return JSON.stringify(payload);
  } catch {
    try {
      return await response.text();
    } catch {
      return '';
    }
  }
}

export class GroqConfigurationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GroqConfigurationError';
    this.code = 'GROQ_CONFIG_ERROR';
    this.statusCode = 500;
  }
}

export class GroqTimeoutError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GroqTimeoutError';
    this.code = 'GROQ_TIMEOUT';
    this.statusCode = 504;
  }
}

export class GroqUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GroqUnavailableError';
    this.code = 'GROQ_UNAVAILABLE';
    this.statusCode = 503;
  }
}

export class GroqAuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GroqAuthenticationError';
    this.code = 'GROQ_AUTH_ERROR';
    this.statusCode = 502;
  }
}

export class GroqRateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GroqRateLimitError';
    this.code = 'GROQ_RATE_LIMITED';
    this.statusCode = 503;
  }
}

export class GroqResponseEmptyError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GroqResponseEmptyError';
    this.code = 'EMPTY_RESPONSE';
    this.statusCode = 502;
  }
}

export class GroqInvalidResponseError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GroqInvalidResponseError';
    this.code = 'INVALID_MODEL_OUTPUT';
    this.statusCode = 502;
  }
}

export class GroqClient {
  constructor({ apiKey, baseUrl, model, timeoutMs, temperature, maxCompletionTokens }) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.model = model;
    this.timeoutMs = timeoutMs;
    this.temperature = temperature;
    this.maxCompletionTokens = maxCompletionTokens;
  }

  async generateStructuredSummary(messages) {
    if (!this.apiKey) {
      throw new GroqConfigurationError(
        'GROQ_API_KEY is required to generate AI summaries.',
      );
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response;

    try {
      response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages,
          temperature: this.temperature,
          max_completion_tokens: this.maxCompletionTokens,
          response_format: {
            type: 'json_object',
          },
        }),
        signal: controller.signal,
      });
    } catch (error) {
      clearTimeout(timeoutId);

      if (error?.name === 'AbortError') {
        throw new GroqTimeoutError('The Groq request exceeded the configured timeout.');
      }

      throw new GroqUnavailableError('Unable to reach the Groq API.');
    }

    clearTimeout(timeoutId);

    if (!response.ok) {
      const details = await readErrorDetails(response);

      if (response.status === 401 || response.status === 403) {
        throw new GroqAuthenticationError(
          `Groq authentication failed.${details ? ` ${details}` : ''}`.trim(),
        );
      }

      if (response.status === 429) {
        throw new GroqRateLimitError(
          `Groq rate limit reached.${details ? ` ${details}` : ''}`.trim(),
        );
      }

      if (response.status >= 500) {
        throw new GroqUnavailableError(
          `Groq is temporarily unavailable.${details ? ` ${details}` : ''}`.trim(),
        );
      }

      throw new GroqConfigurationError(
        `Groq rejected the request.${details ? ` ${details}` : ''}`.trim(),
      );
    }

    let payload;

    try {
      payload = await response.json();
    } catch {
      throw new GroqInvalidResponseError('The Groq HTTP response is not valid JSON.');
    }

    const content = payload?.choices?.[0]?.message?.content;
    return extractJsonObject(content);
  }
}
