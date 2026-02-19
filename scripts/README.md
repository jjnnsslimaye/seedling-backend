# Database Scripts

## reset_test_db.py

Resets the test database by deleting all records while preserving the admin user (id=1).

### Usage

```bash
python scripts/reset_test_db.py
```

### What it does

1. **Deletes records in order** (respecting foreign key constraints):
   - judge_assignments
   - payments
   - submissions
   - competitions
   - user_bank_accounts
   - users (except admin user id=1)

2. **Resets auto-increment sequences** (except users table)

3. **Prints summary** of deleted records

### Safety Features

- Requires confirmation before proceeding ("yes" to continue)
- Preserves admin user (id=1)
- Shows before/after record counts
- Rolls back on error

### Example Output

```
==============================================================
DATABASE RESET SCRIPT
==============================================================
Database: sqlite+aiosqlite:///./app.db

This will delete ALL data except admin user. Continue? (yes/no): yes

Starting database reset...

Counting records before deletion:
  judge_assignments: 10 records
  payments: 5 records
  submissions: 8 records
  competitions: 2 records
  user_bank_accounts: 3 records
  users: 4 records

Deleting records...
  ✓ Deleted 10 judge_assignments
  ✓ Deleted 5 payments
  ✓ Deleted 8 submissions
  ✓ Deleted 2 competitions
  ✓ Deleted 3 user_bank_accounts
  ✓ Deleted 3 users (kept admin user id=1)

Resetting auto-increment sequences...
  ✓ Reset sequences (preserved users sequence)

==============================================================
DATABASE RESET COMPLETE
==============================================================

Records after reset:
  judge_assignments: 0 records (deleted 10)
  payments: 0 records (deleted 5)
  submissions: 0 records (deleted 8)
  competitions: 0 records (deleted 2)
  user_bank_accounts: 0 records (deleted 3)
  users: 1 records (deleted 3)

Preserved admin user:
  ID: 1
  Username: admin
  Email: admin@example.com
  Role: admin

✅ Database reset successful!
```

### Warning

⚠️ **This script deletes all data!** Only use for testing purposes.
