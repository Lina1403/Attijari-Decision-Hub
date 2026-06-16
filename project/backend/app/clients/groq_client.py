from __future__ import annotations

import json

import requests


class GroqClientError(Exception):
    status_code = 500
    code = "GROQ_ERROR"


class GroqConfigurationError(GroqClientError):
    status_code = 500
    code = "GROQ_CONFIG_ERROR"


class GroqTimeoutError(GroqClientError):
    status_code = 504
    code = "GROQ_TIMEOUT"


class GroqUnavailableError(GroqClientError):
    status_code = 503
    code = "GROQ_UNAVAILABLE"


class GroqAuthenticationError(GroqClientError):
    status_code = 502
    code = "GROQ_AUTH_ERROR"


class GroqRateLimitError(GroqClientError):
    status_code = 503
    code = "GROQ_RATE_LIMITED"


class GroqInvalidResponseError(GroqClientError):
    status_code = 502
    code = "INVALID_MODEL_OUTPUT"


def extract_json_object(raw_text: str):
    trimmed = str(raw_text or "").strip()
    if not trimmed:
        raise GroqInvalidResponseError("Groq returned an empty response.")

    try:
        return json.loads(trimmed)
    except json.JSONDecodeError:
        first = trimmed.find("{")
        last = trimmed.rfind("}")
        if first == -1 or last == -1 or last <= first:
            raise GroqInvalidResponseError("The Groq response is not a usable JSON object.")
        try:
            return json.loads(trimmed[first : last + 1])
        except json.JSONDecodeError as exc:
            raise GroqInvalidResponseError("The Groq response is not valid JSON.") from exc


class GroqClient:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        model: str,
        timeout_seconds: float,
        max_completion_tokens: int,
    ):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.max_completion_tokens = max_completion_tokens

    def generate_structured_summary(self, messages):
        if not self.api_key:
            raise GroqConfigurationError("GROQ_API_KEY is required to generate AI summaries.")

        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {self.api_key}",
                },
                json={
                    "model": self.model,
                    "messages": messages,
                    "temperature": 0.2,
                    "max_completion_tokens": self.max_completion_tokens,
                    "response_format": {"type": "json_object"},
                },
                timeout=self.timeout_seconds,
            )
        except requests.Timeout as exc:
            raise GroqTimeoutError("The Groq request exceeded the configured timeout.") from exc
        except requests.RequestException as exc:
            raise GroqUnavailableError("Unable to reach the Groq API.") from exc

        if response.status_code in {401, 403}:
            raise GroqAuthenticationError("Groq authentication failed.")
        if response.status_code == 429:
            raise GroqRateLimitError("Groq rate limit reached.")
        if response.status_code >= 500:
            raise GroqUnavailableError("Groq is temporarily unavailable.")
        if not response.ok:
            raise GroqConfigurationError("Groq rejected the request.")

        try:
            payload = response.json()
        except ValueError as exc:
            raise GroqInvalidResponseError("The Groq HTTP response is not valid JSON.") from exc

        content = payload.get("choices", [{}])[0].get("message", {}).get("content")
        return extract_json_object(content)
