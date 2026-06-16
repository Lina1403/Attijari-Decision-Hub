USE master;
GO

IF NOT EXISTS (SELECT 1 FROM sys.sql_logins WHERE name = N'attijari_app')
BEGIN
  CREATE LOGIN attijari_app WITH PASSWORD = 'AttijariApp2026!';
END
GO

USE DWH_AttijariBI_Final;
GO

IF NOT EXISTS (SELECT 1 FROM sys.database_principals WHERE name = N'attijari_app')
BEGIN
  CREATE USER attijari_app FOR LOGIN attijari_app;
END
GO

ALTER ROLE db_datareader ADD MEMBER attijari_app;
ALTER ROLE db_datawriter ADD MEMBER attijari_app;
GO
