function formatContext(context) {
  if (!context || typeof context !== 'object' || !Object.keys(context).length) {
    return '';
  }

  try {
    return ` ${JSON.stringify(context)}`;
  } catch {
    return '';
  }
}

export function createLogger(scope) {
  function write(level, message, context) {
    const timestamp = new Date().toISOString();
    const suffix = formatContext(context);
    const line = `[${timestamp}] [${scope}] [${level}] ${message}${suffix}`;

    if (level === 'ERROR') {
      console.error(line);
      return;
    }

    if (level === 'WARN') {
      console.warn(line);
      return;
    }

    console.log(line);
  }

  return {
    info(message, context) {
      write('INFO', message, context);
    },
    warn(message, context) {
      write('WARN', message, context);
    },
    error(message, context) {
      write('ERROR', message, context);
    },
  };
}
