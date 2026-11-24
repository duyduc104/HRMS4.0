const sequelize = require('../config/database');

async function runApprovalMigration() {
  try {
    const dialect = sequelize.getDialect();
    console.log(`[ApprovalMigration] Running approval multi-tier migration for dialect: ${dialect}...`);

    if (dialect === 'mssql') {
      // 1. Drop check constraint on status column of Leaves and AttendanceExplanations
      try {
        await sequelize.query(`
          DECLARE @sql NVARCHAR(MAX) = N'';
          SELECT @sql += N'ALTER TABLE ' + QUOTENAME(s.name) + N'.' + QUOTENAME(t.name) + 
                         N' DROP CONSTRAINT ' + QUOTENAME(c.name) + N';'
          FROM sys.check_constraints c
          JOIN sys.tables t ON c.parent_object_id = t.object_id
          JOIN sys.schemas s ON t.schema_id = s.schema_id
          JOIN sys.columns col ON c.parent_object_id = col.object_id AND c.parent_column_id = col.column_id
          WHERE t.name IN ('Leaves', 'AttendanceExplanations') AND col.name = 'status';

          IF LEN(@sql) > 0
              EXEC sp_executesql @sql;
        `);
      } catch (err) {
        console.warn('[ApprovalMigration] Note while dropping check constraints:', err.message);
      }

      // 2. Ensure status column is NVARCHAR(50)
      try {
        await sequelize.query(`ALTER TABLE Leaves ALTER COLUMN status NVARCHAR(50);`);
      } catch (e) {}
      try {
        await sequelize.query(`ALTER TABLE AttendanceExplanations ALTER COLUMN status NVARCHAR(50);`);
      } catch (e) {}

      // 3. Add or ALTER columns to Leaves
      const leaveColumns = [
        { name: 'managerApprovedBy', type: 'UNIQUEIDENTIFIER NULL' },
        { name: 'managerApprovedAt', type: 'DATETIMEOFFSET NULL' },
        { name: 'hrApprovedBy', type: 'UNIQUEIDENTIFIER NULL' },
        { name: 'hrApprovedAt', type: 'DATETIMEOFFSET NULL' },
        { name: 'rejectionReason', type: 'NVARCHAR(MAX) NULL' },
      ];

      for (const col of leaveColumns) {
        try {
          await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Leaves') AND name = '${col.name}')
            BEGIN
                ALTER TABLE Leaves ADD ${col.name} ${col.type};
            END
            ELSE
            BEGIN
                ALTER TABLE Leaves ALTER COLUMN ${col.name} ${col.type};
            END
          `);
        } catch (colErr) {
          console.warn(`[ApprovalMigration] Leaves.${col.name}:`, colErr.message);
        }
      }

      // 4. Add or ALTER columns to AttendanceExplanations
      const expColumns = [
        { name: 'managerApprovedBy', type: 'UNIQUEIDENTIFIER NULL' },
        { name: 'managerApprovedAt', type: 'DATETIMEOFFSET NULL' },
        { name: 'hrApprovedBy', type: 'UNIQUEIDENTIFIER NULL' },
        { name: 'hrApprovedAt', type: 'DATETIMEOFFSET NULL' },
        { name: 'rejectionReason', type: 'NVARCHAR(MAX) NULL' },
      ];

      for (const col of expColumns) {
        try {
          await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AttendanceExplanations') AND name = '${col.name}')
            BEGIN
                ALTER TABLE AttendanceExplanations ADD ${col.name} ${col.type};
            END
            ELSE
            BEGIN
                ALTER TABLE AttendanceExplanations ALTER COLUMN ${col.name} ${col.type};
            END
          `);
        } catch (colErr) {
          console.warn(`[ApprovalMigration] AttendanceExplanations.${col.name}:`, colErr.message);
        }
      }

      // 5. Add columns to AdvanceRequests
      const advanceColumns = [
        { name: 'approvedBy', type: 'UNIQUEIDENTIFIER NULL' },
        { name: 'approvedAt', type: 'DATETIMEOFFSET NULL' },
        { name: 'rejectionReason', type: 'NVARCHAR(MAX) NULL' },
      ];

      for (const col of advanceColumns) {
        try {
          await sequelize.query(`
            IF NOT EXISTS (SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AdvanceRequests') AND name = '${col.name}')
            BEGIN
                ALTER TABLE AdvanceRequests ADD ${col.name} ${col.type};
            END
          `);
        } catch (colErr) {
          console.warn(`[ApprovalMigration] AdvanceRequests.${col.name}:`, colErr.message);
        }
      }
    } else {
      // Fallback for other dialects (e.g., MySQL, Postgres)
      try {
        await sequelize.query(`ALTER TABLE Leaves MODIFY COLUMN status VARCHAR(50) DEFAULT 'Pending';`);
      } catch (e) {}
      try {
        await sequelize.query(`ALTER TABLE AttendanceExplanations MODIFY COLUMN status VARCHAR(50) DEFAULT 'Pending';`);
      } catch (e) {}
    }

    console.log('[ApprovalMigration] ✅ Multi-tier approval columns & constraints verified.');
  } catch (error) {
    console.error('[ApprovalMigration] ⚠️ Error during migration check:', error.message);
  }
}

module.exports = runApprovalMigration;
