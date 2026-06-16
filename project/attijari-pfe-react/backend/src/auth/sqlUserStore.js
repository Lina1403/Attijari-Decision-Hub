function sqlString(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  return `N'${String(value).replace(/'/g, "''")}'`;
}

function normalizeUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    email: row.email,
    passwordHash: row.passwordHash,
    firstName: row.firstName,
    lastName: row.lastName,
    fullName: row.fullName,
    initials: row.initials,
    role: String(row.role ?? '').toUpperCase(),
    entity: row.entity,
    refreshToken: row.refreshToken || null,
    createdAt: row.createdAt,
    lastLoginAt: row.lastLoginAt || null,
    isActive: String(row.isActive) === '1' || row.isActive === true,
    source: 'sql',
  };
}

class SqlUserStore {
  sqlClient = null;
  logger = null;

  configure({ sqlClient, logger }) {
    this.sqlClient = sqlClient;
    this.logger = logger;
  }

  isConfigured() {
    return Boolean(this.sqlClient);
  }

  async findByEmail(email) {
    return this.findOne(this.buildUserSelectQuery(`
      WHERE LOWER(email) = LOWER(${sqlString(email)})
        AND is_active = 1
    `));
  }

  async listUsers() {
    if (!this.sqlClient) {
      return [];
    }

    try {
      const rows = await this.sqlClient.queryArray(`
        SELECT
          CONVERT(varchar(36), id) AS id,
          email,
          password_hash AS passwordHash,
          first_name AS firstName,
          last_name AS lastName,
          full_name AS fullName,
          initials,
          role,
          entity,
          refresh_token AS refreshToken,
          CONVERT(varchar(33), created_at, 126) AS createdAt,
          CONVERT(varchar(33), last_login_at, 126) AS lastLoginAt,
          is_active AS isActive
        FROM dbo.Users
        WHERE is_active = 1
        ORDER BY created_at DESC
      `);
      return rows.map((row) => normalizeUser(row)).filter(Boolean);
    } catch (error) {
      this.logger?.error?.('SQL user list failed.', { message: error?.message });
      throw error;
    }
  }

  async findByEmailIncludingInactive(email) {
    return this.findOne(this.buildUserSelectQuery(`
      WHERE LOWER(email) = LOWER(${sqlString(email)})
    `));
  }

  async findById(id) {
    return this.findOne(this.buildUserSelectQuery(`
      WHERE id = TRY_CONVERT(uniqueidentifier, ${sqlString(id)})
        AND is_active = 1
    `));
  }

  async findByRefreshToken(refreshToken) {
    return this.findOne(this.buildUserSelectQuery(`
      WHERE refresh_token = ${sqlString(refreshToken)}
        AND is_active = 1
    `));
  }

  async updateRefreshToken(id, refreshToken) {
    if (!this.sqlClient) return;

    await this.sqlClient.execute(`
      UPDATE dbo.Users
      SET refresh_token = ${sqlString(refreshToken)}
      WHERE id = TRY_CONVERT(uniqueidentifier, ${sqlString(id)})
    `);
  }

  async updateProfile(id, { email, firstName, lastName, entity }) {
    if (!this.sqlClient) return;

    const normalizedFirstName = String(firstName ?? '').trim();
    const normalizedLastName = String(lastName ?? '').trim();
    const normalizedEntity = String(entity ?? 'Attijari Bank Tunisia').trim();
    const initials = `${normalizedFirstName.charAt(0)}${normalizedLastName.charAt(0)}`.toUpperCase();

    await this.sqlClient.execute(`
      UPDATE dbo.Users
      SET
        email = LOWER(${sqlString(email)}),
        first_name = ${sqlString(normalizedFirstName)},
        last_name = ${sqlString(normalizedLastName)},
        initials = ${sqlString(initials)},
        entity = ${sqlString(normalizedEntity)}
      WHERE id = TRY_CONVERT(uniqueidentifier, ${sqlString(id)})
    `);
  }

  async updatePasswordHash(id, passwordHash) {
    if (!this.sqlClient) return;

    await this.sqlClient.execute(`
      UPDATE dbo.Users
      SET password_hash = ${sqlString(passwordHash)}
      WHERE id = TRY_CONVERT(uniqueidentifier, ${sqlString(id)})
    `);
  }

  async touchLastLogin(id, lastLoginAt = new Date().toISOString()) {
    if (!this.sqlClient) return;

    await this.sqlClient.execute(`
      UPDATE dbo.Users
      SET last_login_at = TRY_CONVERT(datetime2, ${sqlString(lastLoginAt)})
      WHERE id = TRY_CONVERT(uniqueidentifier, ${sqlString(id)})
    `);
  }

  async deleteUser(id) {
    if (!this.sqlClient) return;

    await this.sqlClient.execute(`
      BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @userId uniqueidentifier = TRY_CONVERT(uniqueidentifier, ${sqlString(id)});

        UPDATE dbo.AccessRequests
        SET reviewed_by = NULL
        WHERE reviewed_by = @userId;

        UPDATE dbo.AccessRequests
        SET approved_user_id = NULL
        WHERE approved_user_id = @userId;

        DELETE FROM dbo.Users
        WHERE id = @userId;

        COMMIT TRANSACTION;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `);
  }

  async findOne(query) {
    if (!this.sqlClient) {
      return null;
    }

    try {
      const row = await this.sqlClient.queryObject(query);
      return normalizeUser(row);
    } catch (error) {
      this.logger?.error?.('SQL user lookup failed.', { message: error?.message });
      throw error;
    }
  }

  buildUserSelectQuery(whereClause) {
    return `
      SELECT TOP 1
        CONVERT(varchar(36), id) AS id,
        email,
        password_hash AS passwordHash,
        first_name AS firstName,
        last_name AS lastName,
        full_name AS fullName,
        initials,
        role,
        entity,
        refresh_token AS refreshToken,
        CONVERT(varchar(33), created_at, 126) AS createdAt,
        CONVERT(varchar(33), last_login_at, 126) AS lastLoginAt,
        is_active AS isActive
      FROM dbo.Users
      ${whereClause}
    `;
  }
}

export const sqlUserStore = new SqlUserStore();
