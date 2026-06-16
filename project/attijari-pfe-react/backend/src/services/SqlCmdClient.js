import sql from 'mssql';
import util from 'util';

export class SqlCmdClient {
  constructor({ config, logger }) {
    this.config = config;
    this.logger = logger;
    this.pool = null;
  }

  getErrorMessage(error) {
    const toText = (value) => {
      if (!value) return '';
      if (typeof value === 'string') return value;
      if (value.message && typeof value.message === 'string') return value.message;
      if (value.code && typeof value.code === 'string') return value.code;

      try {
        return JSON.stringify(value);
      } catch {
        return String(value);
      }
    };

    return [
      error?.message,
      error?.originalError?.message,
      error?.code,
      error?.originalError?.code,
      ...(Array.isArray(error?.precedingErrors)
        ? error.precedingErrors.map((precedingError) => precedingError?.message)
        : []),
    ]
      .filter(Boolean)
      .map(toText)
      .filter(Boolean)
      .filter((message, index, messages) => messages.indexOf(message) === index)
      .join(' ');
  }

  shouldUseMssql() {
    return true;
  }

  async getMssqlPool() {
    if (this.pool?.connected) {
      return this.pool;
    }

    const authMode = this.config.user && this.config.password ? 'sql-login' : 'windows';
    if (authMode === 'windows' && this.config.useWindowsAuth !== true) {
      throw new Error(
        'DB_USER et DB_PASSWORD sont requis pour lire SQL Server depuis le backend. Creez un login SQL dans SSMS ou mettez DB_USE_WINDOWS_AUTH=true pour tester le driver Windows.',
      );
    }

    const driver =
      authMode === 'sql-login' ? sql : (await import('mssql/msnodesqlv8.js')).default;
    const connectionConfig = authMode === 'sql-login'
      ? {
          server: this.config.server,
          database: this.config.database,
          user: this.config.user,
          password: this.config.password,
          options: {
            encrypt: false,
            trustServerCertificate: true,
            enableArithAbort: true,
          },
          requestTimeout: this.config.timeoutMs,
          connectionTimeout: this.config.timeoutMs,
        }
      : {
          driver: 'msnodesqlv8',
          connectionString: [
            'Driver={ODBC Driver 17 for SQL Server}',
            `Server=${this.config.server}`,
            `Database=${this.config.database}`,
            'Trusted_Connection=Yes',
            'TrustServerCertificate=Yes',
            'Encrypt=No',
            `Connection Timeout=${Math.max(1, Math.ceil(this.config.timeoutMs / 1000))}`,
          ].join(';'),
          requestTimeout: this.config.timeoutMs,
          connectionTimeout: this.config.timeoutMs,
        };

    this.pool = await driver.connect(connectionConfig);

    return this.pool;
  }

  buildBaseArgs(query) {
    const args = [
      '-S',
      this.config.server,
      '-d',
      this.config.database,
      '-I',
      '-b',
      '-s',
      '\t',
      '-W',
      '-w',
      '65535',
      '-Q',
      `SET NOCOUNT ON; ${query.trim()}`,
    ];

    if (this.config.user && this.config.password) {
      args.unshift('-P', this.config.password);
      args.unshift('-U', this.config.user);
    } else {
      args.unshift('-E');
    }

    return args;
  }

  async execute(query) {
    if (this.shouldUseMssql()) {
      try {
        const pool = await this.getMssqlPool();
        const result = await pool.request().query(query);
        return result.recordsets?.find((recordset) => recordset.length > 0) ?? [];
      } catch (error) {
        const message = this.getErrorMessage(error);
        const errorObject = util.inspect(error, { depth: null });
        this.logger?.error?.('MSSQL query failed.', {
          server: this.config.server,
          database: this.config.database,
          authMode: this.config.user && this.config.password ? 'sql-login' : 'windows',
          message,
          errorObject,
        });

        const wrappedError = new Error(
          `Impossible de lire les donnees SQL Server via mssql.${message ? ` ${message}` : ''}`.trim(),
        );
        wrappedError.cause = error;
        throw wrappedError;
      }
    }

    throw new Error('SQL Server doit etre lu via mssql, pas via users.json/sqlcmd.');
  }

  async queryObject(query) {
    const rows = await this.queryArray(query);
    return rows[0] ?? null;
  }

  async queryArray(query) {
    if (this.shouldUseMssql()) {
      const rows = await this.execute(query);
      return Array.isArray(rows) ? rows : [];
    }

    const rows = await this.execute(query);
    return Array.isArray(rows) ? rows : [];
  }

  async close() {
    if (this.pool) {
      await this.pool.close();
      this.pool = null;
    }
  }
}
