#!/usr/bin/env python3
"""
Database reset script for testing.

Deletes all records from tables while preserving the admin user (id=1).
Run with: python scripts/reset_test_db.py

WARNING: This will delete all data except the admin user!
"""

import sys
import asyncio
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.config import get_settings


async def reset_database():
    """Reset the database by deleting all records except admin user."""

    settings = get_settings()

    # Create async engine
    engine = create_async_engine(
        settings.database_url,
        echo=False,  # Set to True to see SQL queries
    )

    # Create session factory
    async_session = sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    print("=" * 60)
    print("DATABASE RESET SCRIPT")
    print("=" * 60)
    print(f"Database: {settings.database_url}")
    print()

    # Confirm before proceeding
    response = input("This will delete ALL data except admin user. Continue? (yes/no): ")
    if response.lower() != "yes":
        print("Aborted.")
        return

    print()
    print("Starting database reset...")
    print()

    async with async_session() as session:
        try:
            # Disable foreign key constraints temporarily (SQLite)
            await session.execute(text("PRAGMA foreign_keys = OFF"))

            # Count records before deletion
            print("Counting records before deletion:")
            counts_before = {}

            tables = [
                "judge_assignments",
                "payments",
                "submissions",
                "competitions",
                "user_bank_accounts",
                "users"
            ]

            for table in tables:
                result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                counts_before[table] = count
                print(f"  {table}: {count} records")

            print()

            # Delete records in correct order (respecting foreign keys)
            print("Deleting records...")

            # 1. Delete judge assignments (no dependencies)
            result = await session.execute(text("DELETE FROM judge_assignments"))
            print(f"  ✓ Deleted {result.rowcount} judge_assignments")

            # 2. Delete payments (depends on users, competitions, submissions)
            result = await session.execute(text("DELETE FROM payments"))
            print(f"  ✓ Deleted {result.rowcount} payments")

            # 3. Delete submissions (depends on users, competitions)
            result = await session.execute(text("DELETE FROM submissions"))
            print(f"  ✓ Deleted {result.rowcount} submissions")

            # 4. Delete competitions (depends on users)
            result = await session.execute(text("DELETE FROM competitions"))
            print(f"  ✓ Deleted {result.rowcount} competitions")

            # 5. Delete user bank accounts (depends on users)
            result = await session.execute(text("DELETE FROM user_bank_accounts"))
            print(f"  ✓ Deleted {result.rowcount} user_bank_accounts")

            # 6. Delete users EXCEPT admin (id=1)
            result = await session.execute(text("DELETE FROM users WHERE id != 1"))
            deleted_users = result.rowcount
            print(f"  ✓ Deleted {deleted_users} users (kept admin user id=1)")

            # Re-enable foreign key constraints
            await session.execute(text("PRAGMA foreign_keys = ON"))

            # Reset auto-increment sequences for SQLite
            # SQLite automatically reuses IDs, but we can reset the sequence
            print()
            print("Resetting auto-increment sequences...")

            # For SQLite, delete from sqlite_sequence to reset auto-increment
            # But keep the users sequence so new users start after admin
            await session.execute(text("DELETE FROM sqlite_sequence WHERE name != 'users'"))
            print("  ✓ Reset sequences (preserved users sequence)")

            # Commit all changes
            await session.commit()

            print()
            print("=" * 60)
            print("DATABASE RESET COMPLETE")
            print("=" * 60)
            print()

            # Count records after deletion
            print("Records after reset:")
            for table in tables:
                result = await session.execute(text(f"SELECT COUNT(*) FROM {table}"))
                count = result.scalar()
                deleted = counts_before[table] - count
                print(f"  {table}: {count} records (deleted {deleted})")

            print()

            # Show admin user info
            result = await session.execute(
                text("SELECT id, username, email, role FROM users WHERE id = 1")
            )
            admin = result.fetchone()
            if admin:
                print("Preserved admin user:")
                print(f"  ID: {admin[0]}")
                print(f"  Username: {admin[1]}")
                print(f"  Email: {admin[2]}")
                print(f"  Role: {admin[3]}")
            else:
                print("WARNING: No admin user found!")

            print()
            print("✅ Database reset successful!")

        except Exception as e:
            await session.rollback()
            print()
            print(f"❌ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            sys.exit(1)

        finally:
            await engine.dispose()


if __name__ == "__main__":
    asyncio.run(reset_database())
