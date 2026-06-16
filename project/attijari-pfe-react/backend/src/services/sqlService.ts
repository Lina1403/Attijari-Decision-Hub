/**
 * Configuration SQL Server
 * Attijari DWH
 */
import sql from 'mssql';

type SqlParameterValue = string | number | boolean | Date | null;

const config = {
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || 'YourPassword123!',
  server: 'ASUS',
  database: 'DWH_AttijariBI_Final',
  port: 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableKeepAlive: true,
  },
  connectionTimeout: 30000,
  requestTimeout: 30000,
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

export const getPool = async (): Promise<sql.ConnectionPool> => {
  if (pool) {
    return pool;
  }

  try {
    pool = new sql.ConnectionPool(config);
    await pool.connect();
    console.log('✓ SQL Server connecté : ASUS / DWH_AttijariBI_Final');
    return pool;
  } catch (error) {
    console.error('✗ Erreur connexion SQL Server:', error);
    throw error;
  }
};

export const query = async (
  sqlQuery: string,
  params?: Record<string, SqlParameterValue>,
) => {
  try {
    const pool = await getPool();
    const request = pool.request();

    if (params) {
      Object.keys(params).forEach((key) => {
        request.input(key, params[key]);
      });
    }

    const result = await request.query(sqlQuery);
    return result.recordset;
  } catch (error) {
    console.error('✗ Erreur requête SQL:', error);
    throw error;
  }
};

export const closePool = async () => {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('✓ Pool SQL Server fermé');
  }
};
