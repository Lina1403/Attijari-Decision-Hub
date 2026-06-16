SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO

IF OBJECT_ID('dbo.Users', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Users (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_Users PRIMARY KEY DEFAULT NEWID(),
    email NVARCHAR(255) NOT NULL,
    password_hash NVARCHAR(255) NOT NULL,
    first_name NVARCHAR(100) NOT NULL,
    last_name NVARCHAR(100) NOT NULL,
    full_name AS LTRIM(RTRIM(CONCAT(first_name, N' ', last_name))) PERSISTED,
    initials NVARCHAR(10) NOT NULL,
    role NVARCHAR(20) NOT NULL
      CONSTRAINT CK_Users_Role
      CHECK (role IN ('ADMIN', 'MARKETING', 'COMMERCIAL')),
    entity NVARCHAR(200) NOT NULL CONSTRAINT DF_Users_Entity DEFAULT N'Attijari Bank Tunisia',
    refresh_token NVARCHAR(MAX) NULL,
    created_at DATETIME2 NOT NULL CONSTRAINT DF_Users_CreatedAt DEFAULT SYSUTCDATETIME(),
    last_login_at DATETIME2 NULL,
    is_active BIT NOT NULL CONSTRAINT DF_Users_IsActive DEFAULT 1
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.Users')
    AND name = 'UX_Users_Email'
)
BEGIN
  CREATE UNIQUE INDEX UX_Users_Email
    ON dbo.Users(email);
END;
GO

IF OBJECT_ID('dbo.AccessRequests', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.AccessRequests (
    id UNIQUEIDENTIFIER NOT NULL CONSTRAINT PK_AccessRequests PRIMARY KEY DEFAULT NEWID(),
    full_name NVARCHAR(200) NOT NULL,
    email NVARCHAR(255) NOT NULL,
    requested_role NVARCHAR(20) NOT NULL
      CONSTRAINT CK_AccessRequests_RequestedRole
      CHECK (requested_role IN ('MARKETING', 'COMMERCIAL')),
    message NVARCHAR(1000) NULL,
    status NVARCHAR(20) NOT NULL
      CONSTRAINT DF_AccessRequests_Status DEFAULT 'EN_ATTENTE'
      CONSTRAINT CK_AccessRequests_Status
      CHECK (status IN ('EN_ATTENTE', 'APPROUVEE', 'REFUSEE')),
    requested_at DATETIME2 NOT NULL CONSTRAINT DF_AccessRequests_RequestedAt DEFAULT SYSUTCDATETIME(),
    reviewed_at DATETIME2 NULL,
    reviewed_by UNIQUEIDENTIFIER NULL,
    approved_user_id UNIQUEIDENTIFIER NULL,
    review_comment NVARCHAR(500) NULL,
    CONSTRAINT FK_AccessRequests_ReviewedBy FOREIGN KEY (reviewed_by) REFERENCES dbo.Users(id),
    CONSTRAINT FK_AccessRequests_ApprovedUser FOREIGN KEY (approved_user_id) REFERENCES dbo.Users(id)
  );
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.AccessRequests')
    AND name = 'UX_AccessRequests_Email_Pending'
)
BEGIN
  CREATE UNIQUE INDEX UX_AccessRequests_Email_Pending
    ON dbo.AccessRequests(email)
    WHERE status = 'EN_ATTENTE';
END;
GO

IF NOT EXISTS (
  SELECT 1
  FROM sys.indexes
  WHERE object_id = OBJECT_ID('dbo.AccessRequests')
    AND name = 'IX_AccessRequests_Status_RequestedAt'
)
BEGIN
  CREATE INDEX IX_AccessRequests_Status_RequestedAt
    ON dbo.AccessRequests(status, requested_at DESC);
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE LOWER(email) = LOWER(N'admin@attijari.tn'))
BEGIN
  INSERT INTO dbo.Users (
    email,
    password_hash,
    first_name,
    last_name,
    initials,
    role,
    entity,
    created_at,
    is_active
  )
  VALUES (
    LOWER(N'admin@attijari.tn'),
    N'$2b$10$GhuTLgOSEVBMk/lF6Di86OKlufotJ2BtSbjw/fIqQojQ4K9xSOvze',
    N'Admin',
    N'Attijari',
    N'AA',
    N'ADMIN',
    N'Attijari Bank Tunisia',
    SYSUTCDATETIME(),
    1
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE LOWER(email) = LOWER(N'demo@attijari.tn'))
BEGIN
  INSERT INTO dbo.Users (
    email,
    password_hash,
    first_name,
    last_name,
    initials,
    role,
    entity,
    created_at,
    is_active
  )
  VALUES (
    LOWER(N'demo@attijari.tn'),
    N'$2b$10$.ebIa8COaVuUtofH4Ta.UO7oU8iuLCp7xwsYqJGv6CncAgLgu8tWK',
    N'Lina',
    N'Ben Ali',
    N'LB',
    N'ADMIN',
    N'Attijari Bank Tunisia',
    SYSUTCDATETIME(),
    1
  );
END;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Users WHERE LOWER(email) = LOWER(N'commercial@attijari.tn'))
BEGIN
  INSERT INTO dbo.Users (
    email,
    password_hash,
    first_name,
    last_name,
    initials,
    role,
    entity,
    created_at,
    is_active
  )
  VALUES (
    LOWER(N'commercial@attijari.tn'),
    N'$2b$10$cbAaXP/ZzHLkbu9ekW8U5.vmhuvh08zk8EaD5LRZhsZjxJ716Ly.C',
    N'Direction',
    N'Marche',
    N'DM',
    N'COMMERCIAL',
    N'Attijari Bank Tunisia',
    SYSUTCDATETIME(),
    1
  );
END;
GO
