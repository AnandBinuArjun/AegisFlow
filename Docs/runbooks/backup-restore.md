# Runbook: Backup and Restoration Procedures

## Objective
Provide tested, reproducible procedures for PostgreSQL database backups, encrypted storage, and disaster recovery.

## 1. Automated Backup Procedure
```bash
# Set timestamp and backup target
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/secure/backups/aegisflow_${TIMESTAMP}.sql.gz"

# Dump database with encryption
docker exec -t aegisflow-db pg_dump -U aegis_user aegisflow | gzip | gpg --encrypt --recipient ops@aegisflow.internal > "${BACKUP_FILE}"
```

## 2. Restoration Procedure
```bash
# Decrypt and restore to clean database instance
gpg --decrypt "${BACKUP_FILE}" | gunzip | docker exec -i aegisflow-db psql -U aegis_user -d aegisflow

# Run migration check to verify schema integrity
alembic current
```

## 3. Verification Schedule
- Backups run daily with 30-day encrypted retention.
- Restoration drills conducted monthly in staging.
