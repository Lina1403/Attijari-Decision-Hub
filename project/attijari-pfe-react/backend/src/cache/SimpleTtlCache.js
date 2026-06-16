export class SimpleTtlCache {
  constructor({ ttlMs }) {
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  get(key) {
    this.cleanup();

    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    return entry.value;
  }

  set(key, value) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  cleanup() {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt <= now) {
        this.store.delete(key);
      }
    }
  }
}
