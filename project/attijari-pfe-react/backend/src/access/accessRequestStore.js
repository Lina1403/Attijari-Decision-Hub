function sqlString(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  return `N'${String(value).replace(/'/g, "''")}'`;
}

function normalizeRequest(row) {
  if (!row) {
    return null;
  }

  const nullable = (value) => {
    if (value === null || value === undefined) {
      return null;
    }

    return String(value).toUpperCase() === 'NULL' ? null : value;
  };

  return {
    id: row.id,
    fullName: row.fullName,
    email: row.email,
    requestedRole: String(row.requestedRole ?? '').toUpperCase(),
    message: row.message || '',
    status: String(row.status ?? '').toUpperCase(),
    requestedAt: row.requestedAt,
    reviewedAt: nullable(row.reviewedAt),
    reviewedBy: nullable(row.reviewedBy),
    reviewedByName: nullable(row.reviewedByName),
    approvedUserId: nullable(row.approvedUserId),
    reviewComment: nullable(row.reviewComment),
  };
}

class AccessRequestStore {
  sqlClient = null;
  logger = null;

  configure({ sqlClient, logger }) {
    this.sqlClient = sqlClient;
    this.logger = logger;
  }

  isConfigured() {
    return Boolean(this.sqlClient);
  }

  async listRequests() {
    return this.findMany(`
      SELECT
        CONVERT(varchar(36), ar.id) AS id,
        ar.full_name AS fullName,
        ar.email,
        ar.requested_role AS requestedRole,
        ar.message,
        ar.status,
        CONVERT(varchar(33), ar.requested_at, 126) AS requestedAt,
        CONVERT(varchar(33), ar.reviewed_at, 126) AS reviewedAt,
        CONVERT(varchar(36), ar.reviewed_by) AS reviewedBy,
        reviewer.full_name AS reviewedByName,
        CONVERT(varchar(36), ar.approved_user_id) AS approvedUserId,
        ar.review_comment AS reviewComment
      FROM dbo.AccessRequests ar
      LEFT JOIN dbo.Users reviewer ON reviewer.id = ar.reviewed_by
      ORDER BY
        CASE ar.status
          WHEN 'EN_ATTENTE' THEN 0
          WHEN 'APPROUVEE' THEN 1
          ELSE 2
        END,
        ar.requested_at DESC
    `);
  }

  async findById(id) {
    return this.findOne(`
      SELECT TOP 1
        CONVERT(varchar(36), ar.id) AS id,
        ar.full_name AS fullName,
        ar.email,
        ar.requested_role AS requestedRole,
        ar.message,
        ar.status,
        CONVERT(varchar(33), ar.requested_at, 126) AS requestedAt,
        CONVERT(varchar(33), ar.reviewed_at, 126) AS reviewedAt,
        CONVERT(varchar(36), ar.reviewed_by) AS reviewedBy,
        reviewer.full_name AS reviewedByName,
        CONVERT(varchar(36), ar.approved_user_id) AS approvedUserId,
        ar.review_comment AS reviewComment
      FROM dbo.AccessRequests ar
      LEFT JOIN dbo.Users reviewer ON reviewer.id = ar.reviewed_by
      WHERE ar.id = TRY_CONVERT(uniqueidentifier, ${sqlString(id)})
    `);
  }

  async findPendingByEmail(email) {
    return this.findOne(`
      SELECT TOP 1
        CONVERT(varchar(36), ar.id) AS id,
        ar.full_name AS fullName,
        ar.email,
        ar.requested_role AS requestedRole,
        ar.message,
        ar.status,
        CONVERT(varchar(33), ar.requested_at, 126) AS requestedAt,
        CONVERT(varchar(33), ar.reviewed_at, 126) AS reviewedAt,
        CONVERT(varchar(36), ar.reviewed_by) AS reviewedBy,
        NULL AS reviewedByName,
        CONVERT(varchar(36), ar.approved_user_id) AS approvedUserId,
        ar.review_comment AS reviewComment
      FROM dbo.AccessRequests ar
      WHERE LOWER(ar.email) = LOWER(${sqlString(email)})
        AND ar.status = 'EN_ATTENTE'
      ORDER BY ar.requested_at DESC
    `);
  }

  async createRequest({ fullName, email, requestedRole, message }) {
    return this.findOne(`
      DECLARE @requestId uniqueidentifier = NEWID();

      INSERT INTO dbo.AccessRequests (
        id,
        full_name,
        email,
        requested_role,
        message,
        status
      )
      VALUES (
        @requestId,
        ${sqlString(fullName)},
        LOWER(${sqlString(email)}),
        ${sqlString(requestedRole)},
        ${sqlString(message)},
        N'EN_ATTENTE'
      );

      SELECT TOP 1
        CONVERT(varchar(36), ar.id) AS id,
        ar.full_name AS fullName,
        ar.email,
        ar.requested_role AS requestedRole,
        ar.message,
        ar.status,
        CONVERT(varchar(33), ar.requested_at, 126) AS requestedAt,
        CONVERT(varchar(33), ar.reviewed_at, 126) AS reviewedAt,
        CONVERT(varchar(36), ar.reviewed_by) AS reviewedBy,
        NULL AS reviewedByName,
        CONVERT(varchar(36), ar.approved_user_id) AS approvedUserId,
        ar.review_comment AS reviewComment
      FROM dbo.AccessRequests ar
      WHERE ar.id = @requestId
    `);
  }

  async approveRequest({
    requestId,
    reviewerId,
    firstName,
    lastName,
    initials,
    email,
    passwordHash,
    role,
    entity = 'Attijari Bank Tunisia',
  }) {
    return this.findOne(`
      BEGIN TRY
        BEGIN TRANSACTION;

        DECLARE @requestId uniqueidentifier = TRY_CONVERT(uniqueidentifier, ${sqlString(requestId)});
        DECLARE @reviewerId uniqueidentifier = TRY_CONVERT(uniqueidentifier, ${sqlString(reviewerId)});
        DECLARE @userId uniqueidentifier = NEWID();

        INSERT INTO dbo.Users (
          id,
          email,
          password_hash,
          first_name,
          last_name,
          initials,
          role,
          entity,
          refresh_token,
          created_at,
          last_login_at,
          is_active
        )
        VALUES (
          @userId,
          LOWER(${sqlString(email)}),
          ${sqlString(passwordHash)},
          ${sqlString(firstName)},
          ${sqlString(lastName)},
          ${sqlString(initials)},
          ${sqlString(role)},
          ${sqlString(entity)},
          NULL,
          SYSUTCDATETIME(),
          NULL,
          1
        );

        UPDATE dbo.AccessRequests
        SET
          status = N'APPROUVEE',
          reviewed_at = SYSUTCDATETIME(),
          reviewed_by = @reviewerId,
          approved_user_id = @userId,
          review_comment = NULL
        WHERE id = @requestId;

        COMMIT TRANSACTION;

        SELECT TOP 1
          CONVERT(varchar(36), ar.id) AS id,
          ar.full_name AS fullName,
          ar.email,
          ar.requested_role AS requestedRole,
          ar.message,
          ar.status,
          CONVERT(varchar(33), ar.requested_at, 126) AS requestedAt,
          CONVERT(varchar(33), ar.reviewed_at, 126) AS reviewedAt,
          CONVERT(varchar(36), ar.reviewed_by) AS reviewedBy,
          reviewer.full_name AS reviewedByName,
          CONVERT(varchar(36), ar.approved_user_id) AS approvedUserId,
          ar.review_comment AS reviewComment
        FROM dbo.AccessRequests ar
        LEFT JOIN dbo.Users reviewer ON reviewer.id = ar.reviewed_by
        WHERE ar.id = @requestId;
      END TRY
      BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;
        THROW;
      END CATCH
    `);
  }

  async rejectRequest({ requestId, reviewerId, reviewComment = null }) {
    return this.findOne(`
      UPDATE dbo.AccessRequests
      SET
        status = N'REFUSEE',
        reviewed_at = SYSUTCDATETIME(),
        reviewed_by = TRY_CONVERT(uniqueidentifier, ${sqlString(reviewerId)}),
        review_comment = ${sqlString(reviewComment)}
      WHERE id = TRY_CONVERT(uniqueidentifier, ${sqlString(requestId)});

      SELECT TOP 1
        CONVERT(varchar(36), ar.id) AS id,
        ar.full_name AS fullName,
        ar.email,
        ar.requested_role AS requestedRole,
        ar.message,
        ar.status,
        CONVERT(varchar(33), ar.requested_at, 126) AS requestedAt,
        CONVERT(varchar(33), ar.reviewed_at, 126) AS reviewedAt,
        CONVERT(varchar(36), ar.reviewed_by) AS reviewedBy,
        reviewer.full_name AS reviewedByName,
        CONVERT(varchar(36), ar.approved_user_id) AS approvedUserId,
        ar.review_comment AS reviewComment
      FROM dbo.AccessRequests ar
      LEFT JOIN dbo.Users reviewer ON reviewer.id = ar.reviewed_by
      WHERE ar.id = TRY_CONVERT(uniqueidentifier, ${sqlString(requestId)});
    `);
  }

  async findOne(query) {
    if (!this.sqlClient) {
      return null;
    }

    try {
      const row = await this.sqlClient.queryObject(query);
      return normalizeRequest(row);
    } catch (error) {
      this.logger?.error?.("Lecture SQL d'une demande d'acces en echec.", {
        message: error?.message,
      });
      throw error;
    }
  }

  async findMany(query) {
    if (!this.sqlClient) {
      return [];
    }

    try {
      const rows = await this.sqlClient.queryArray(query);
      return rows.map(normalizeRequest);
    } catch (error) {
      this.logger?.error?.("Lecture SQL des demandes d'acces en echec.", {
        message: error?.message,
      });
      throw error;
    }
  }
}

export const accessRequestStore = new AccessRequestStore();
