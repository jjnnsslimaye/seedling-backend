"""initial_schema

Revision ID: 0000000000000
Revises:
Create Date: 2026-02-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '0000000000000'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create enum types with exception handling for idempotency
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE userrole AS ENUM ('founder', 'judge', 'admin');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE competitionstatus AS ENUM ('draft', 'upcoming', 'active', 'closed', 'judging', 'complete');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE submissionstatus AS ENUM ('draft', 'pending_payment', 'submitted', 'under_review', 'winner', 'not_selected', 'rejected');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE paymenttype AS ENUM ('entry_fee', 'prize_payout', 'refund');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    op.execute("""
        DO $$ BEGIN
            CREATE TYPE paymentstatus AS ENUM ('pending', 'completed', 'failed', 'refunded');
        EXCEPTION
            WHEN duplicate_object THEN null;
        END $$;
    """)

    # 1. Create users table
    op.execute("""
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            username VARCHAR(100) NOT NULL,
            hashed_password VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            role userrole NOT NULL DEFAULT 'founder',
            stripe_customer_id VARCHAR(255),
            avatar_url VARCHAR(500),
            stripe_connect_account_id VARCHAR(255),
            connect_onboarding_complete BOOLEAN NOT NULL DEFAULT FALSE,
            connect_charges_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            connect_payouts_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            connect_onboarded_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """)

    op.execute("CREATE INDEX ix_users_id ON users(id);")
    op.execute("CREATE UNIQUE INDEX ix_users_email ON users(email);")
    op.execute("CREATE UNIQUE INDEX ix_users_username ON users(username);")
    op.execute("CREATE INDEX ix_users_role ON users(role);")
    op.execute("CREATE INDEX ix_users_stripe_customer_id ON users(stripe_customer_id);")
    op.execute("CREATE INDEX ix_users_stripe_connect_account_id ON users(stripe_connect_account_id);")

    # 2. Create competitions table
    op.execute("""
        CREATE TABLE competitions (
            id SERIAL PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            domain VARCHAR(100) NOT NULL,
            image_key VARCHAR(255),
            image_url TEXT,
            entry_fee NUMERIC(10, 2) NOT NULL,
            prize_pool NUMERIC(10, 2) NOT NULL,
            platform_fee_percentage NUMERIC(5, 2) NOT NULL,
            max_entries INTEGER NOT NULL,
            current_entries INTEGER NOT NULL DEFAULT 0,
            deadline TIMESTAMP NOT NULL,
            open_date TIMESTAMP NOT NULL,
            judging_sla_days INTEGER NOT NULL,
            status competitionstatus NOT NULL DEFAULT 'draft',
            rubric JSON NOT NULL,
            prize_structure JSON NOT NULL,
            created_by INTEGER NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (created_by) REFERENCES users(id)
        );
    """)

    op.execute("CREATE INDEX ix_competitions_id ON competitions(id);")
    op.execute("CREATE INDEX ix_competitions_domain ON competitions(domain);")
    op.execute("CREATE INDEX ix_competitions_deadline ON competitions(deadline);")
    op.execute("CREATE INDEX ix_competitions_open_date ON competitions(open_date);")
    op.execute("CREATE INDEX ix_competitions_status ON competitions(status);")
    op.execute("CREATE INDEX ix_competitions_created_by ON competitions(created_by);")
    op.execute("CREATE INDEX ix_competitions_status_deadline ON competitions(status, deadline);")
    op.execute("CREATE INDEX ix_competitions_domain_status ON competitions(domain, status);")

    # 3. Create submissions table
    op.execute("""
        CREATE TABLE submissions (
            id SERIAL PRIMARY KEY,
            competition_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT NOT NULL,
            attachments JSON NOT NULL DEFAULT '[]',
            status submissionstatus NOT NULL DEFAULT 'draft',
            is_public BOOLEAN NOT NULL DEFAULT FALSE,
            ai_scores JSON,
            human_scores JSON,
            final_score NUMERIC(10, 2),
            placement VARCHAR(50),
            judge_feedback JSON,
            submitted_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (competition_id) REFERENCES competitions(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)

    op.execute("CREATE INDEX ix_submissions_id ON submissions(id);")
    op.execute("CREATE INDEX ix_submissions_competition_id ON submissions(competition_id);")
    op.execute("CREATE INDEX ix_submissions_user_id ON submissions(user_id);")
    op.execute("CREATE INDEX ix_submissions_status ON submissions(status);")
    op.execute("CREATE INDEX ix_submissions_placement ON submissions(placement);")
    op.execute("CREATE INDEX ix_submissions_submitted_at ON submissions(submitted_at);")
    op.execute("CREATE INDEX ix_submissions_competition_status ON submissions(competition_id, status);")
    op.execute("CREATE INDEX ix_submissions_user_competition ON submissions(user_id, competition_id);")
    op.execute("CREATE INDEX ix_submissions_status_final_score ON submissions(status, final_score);")

    # 4. Create payments table
    op.execute("""
        CREATE TABLE payments (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            competition_id INTEGER NOT NULL,
            submission_id INTEGER,
            amount NUMERIC(10, 2) NOT NULL,
            type paymenttype NOT NULL,
            status paymentstatus NOT NULL DEFAULT 'pending',
            stripe_payment_intent_id VARCHAR(255),
            stripe_transfer_id VARCHAR(255),
            processed_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (competition_id) REFERENCES competitions(id),
            FOREIGN KEY (submission_id) REFERENCES submissions(id)
        );
    """)

    op.execute("CREATE INDEX ix_payments_id ON payments(id);")
    op.execute("CREATE INDEX ix_payments_user_id ON payments(user_id);")
    op.execute("CREATE INDEX ix_payments_competition_id ON payments(competition_id);")
    op.execute("CREATE INDEX ix_payments_submission_id ON payments(submission_id);")
    op.execute("CREATE INDEX ix_payments_type ON payments(type);")
    op.execute("CREATE INDEX ix_payments_status ON payments(status);")
    op.execute("CREATE INDEX ix_payments_stripe_payment_intent_id ON payments(stripe_payment_intent_id);")
    op.execute("CREATE INDEX ix_payments_stripe_transfer_id ON payments(stripe_transfer_id);")
    op.execute("CREATE INDEX ix_payments_user_status ON payments(user_id, status);")
    op.execute("CREATE INDEX ix_payments_competition_type ON payments(competition_id, type);")
    op.execute("CREATE INDEX ix_payments_status_type ON payments(status, type);")

    # 5. Create judge_assignments table
    op.execute("""
        CREATE TABLE judge_assignments (
            id SERIAL PRIMARY KEY,
            judge_id INTEGER NOT NULL,
            submission_id INTEGER NOT NULL,
            assigned_by INTEGER NOT NULL,
            assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            FOREIGN KEY (judge_id) REFERENCES users(id),
            FOREIGN KEY (submission_id) REFERENCES submissions(id),
            FOREIGN KEY (assigned_by) REFERENCES users(id),
            CONSTRAINT uq_judge_submission UNIQUE (judge_id, submission_id)
        );
    """)

    op.execute("CREATE INDEX ix_judge_assignments_id ON judge_assignments(id);")
    op.execute("CREATE INDEX ix_judge_assignments_judge_id ON judge_assignments(judge_id);")
    op.execute("CREATE INDEX ix_judge_assignments_submission_id ON judge_assignments(submission_id);")
    op.execute("CREATE INDEX ix_judge_assignments_assigned_by ON judge_assignments(assigned_by);")

    # 6. Create password_reset_tokens table
    op.execute("""
        CREATE TABLE password_reset_tokens (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            token VARCHAR(255) NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            used BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)

    op.execute("CREATE INDEX ix_password_reset_tokens_id ON password_reset_tokens(id);")
    op.execute("CREATE UNIQUE INDEX ix_password_reset_tokens_token ON password_reset_tokens(token);")
    op.execute("CREATE INDEX ix_password_reset_tokens_user_id ON password_reset_tokens(user_id);")
    op.execute("CREATE INDEX ix_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);")

    # 7. Create user_bank_accounts table
    op.execute("""
        CREATE TABLE user_bank_accounts (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            stripe_bank_account_id VARCHAR(255) NOT NULL,
            bank_account_last4 VARCHAR(4) NOT NULL,
            bank_name VARCHAR(255),
            account_holder_name VARCHAR(255),
            is_default BOOLEAN NOT NULL DEFAULT TRUE,
            verified BOOLEAN NOT NULL DEFAULT FALSE,
            verified_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );
    """)

    op.execute("CREATE INDEX ix_user_bank_accounts_id ON user_bank_accounts(id);")
    op.execute("CREATE INDEX ix_user_bank_accounts_user_id ON user_bank_accounts(user_id);")
    op.execute("CREATE UNIQUE INDEX ix_user_bank_accounts_stripe_bank_account_id ON user_bank_accounts(stripe_bank_account_id);")
    op.execute("CREATE INDEX ix_user_bank_accounts_is_default ON user_bank_accounts(is_default);")


def downgrade() -> None:
    # Drop all tables in reverse order
    op.execute("DROP TABLE IF EXISTS user_bank_accounts CASCADE;")
    op.execute("DROP TABLE IF EXISTS password_reset_tokens CASCADE;")
    op.execute("DROP TABLE IF EXISTS judge_assignments CASCADE;")
    op.execute("DROP TABLE IF EXISTS payments CASCADE;")
    op.execute("DROP TABLE IF EXISTS submissions CASCADE;")
    op.execute("DROP TABLE IF EXISTS competitions CASCADE;")
    op.execute("DROP TABLE IF EXISTS users CASCADE;")

    # Drop enum types
    op.execute("DROP TYPE IF EXISTS paymentstatus CASCADE;")
    op.execute("DROP TYPE IF EXISTS paymenttype CASCADE;")
    op.execute("DROP TYPE IF EXISTS submissionstatus CASCADE;")
    op.execute("DROP TYPE IF EXISTS competitionstatus CASCADE;")
    op.execute("DROP TYPE IF EXISTS userrole CASCADE;")
