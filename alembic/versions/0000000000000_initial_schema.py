"""initial_schema

Revision ID: 0000000000000
Revises:
Create Date: 2026-02-21 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0000000000000'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### Create all tables from scratch ###

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
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('username', sa.String(length=100), nullable=False),
        sa.Column('hashed_password', sa.String(length=255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('role', sa.Enum('founder', 'judge', 'admin', name='userrole', create_type=False), nullable=False, server_default='founder'),
        sa.Column('stripe_customer_id', sa.String(length=255), nullable=True),
        sa.Column('avatar_url', sa.String(length=500), nullable=True),
        sa.Column('stripe_connect_account_id', sa.String(length=255), nullable=True),
        sa.Column('connect_onboarding_complete', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('connect_charges_enabled', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('connect_payouts_enabled', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('connect_onboarded_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
    op.create_index(op.f('ix_users_username'), 'users', ['username'], unique=True)
    op.create_index(op.f('ix_users_role'), 'users', ['role'], unique=False)
    op.create_index(op.f('ix_users_stripe_customer_id'), 'users', ['stripe_customer_id'], unique=False)
    op.create_index(op.f('ix_users_stripe_connect_account_id'), 'users', ['stripe_connect_account_id'], unique=False)

    # 2. Create competitions table
    op.create_table(
        'competitions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('domain', sa.String(length=100), nullable=False),
        sa.Column('image_key', sa.String(length=255), nullable=True),
        sa.Column('image_url', sa.Text(), nullable=True),
        sa.Column('entry_fee', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('prize_pool', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('platform_fee_percentage', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('max_entries', sa.Integer(), nullable=False),
        sa.Column('current_entries', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('deadline', sa.DateTime(), nullable=False),
        sa.Column('open_date', sa.DateTime(), nullable=False),
        sa.Column('judging_sla_days', sa.Integer(), nullable=False),
        sa.Column('status', sa.Enum('draft', 'upcoming', 'active', 'closed', 'judging', 'complete', name='competitionstatus', create_type=False), nullable=False, server_default='draft'),
        sa.Column('rubric', sa.JSON(), nullable=False),
        sa.Column('prize_structure', sa.JSON(), nullable=False),
        sa.Column('created_by', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_competitions_id'), 'competitions', ['id'], unique=False)
    op.create_index(op.f('ix_competitions_domain'), 'competitions', ['domain'], unique=False)
    op.create_index(op.f('ix_competitions_deadline'), 'competitions', ['deadline'], unique=False)
    op.create_index(op.f('ix_competitions_open_date'), 'competitions', ['open_date'], unique=False)
    op.create_index(op.f('ix_competitions_status'), 'competitions', ['status'], unique=False)
    op.create_index(op.f('ix_competitions_created_by'), 'competitions', ['created_by'], unique=False)
    op.create_index('ix_competitions_status_deadline', 'competitions', ['status', 'deadline'], unique=False)
    op.create_index('ix_competitions_domain_status', 'competitions', ['domain', 'status'], unique=False)

    # 3. Create submissions table
    op.create_table(
        'submissions',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('competition_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('attachments', sa.JSON(), nullable=False, server_default='[]'),
        sa.Column('status', sa.Enum('draft', 'pending_payment', 'submitted', 'under_review', 'winner', 'not_selected', 'rejected', name='submissionstatus', create_type=False), nullable=False, server_default='draft'),
        sa.Column('is_public', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('ai_scores', sa.JSON(), nullable=True),
        sa.Column('human_scores', sa.JSON(), nullable=True),
        sa.Column('final_score', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('placement', sa.String(length=50), nullable=True),
        sa.Column('judge_feedback', sa.JSON(), nullable=True),
        sa.Column('submitted_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['competition_id'], ['competitions.id'], ),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_submissions_id'), 'submissions', ['id'], unique=False)
    op.create_index(op.f('ix_submissions_competition_id'), 'submissions', ['competition_id'], unique=False)
    op.create_index(op.f('ix_submissions_user_id'), 'submissions', ['user_id'], unique=False)
    op.create_index(op.f('ix_submissions_status'), 'submissions', ['status'], unique=False)
    op.create_index(op.f('ix_submissions_placement'), 'submissions', ['placement'], unique=False)
    op.create_index(op.f('ix_submissions_submitted_at'), 'submissions', ['submitted_at'], unique=False)
    op.create_index('ix_submissions_competition_status', 'submissions', ['competition_id', 'status'], unique=False)
    op.create_index('ix_submissions_user_competition', 'submissions', ['user_id', 'competition_id'], unique=False)
    op.create_index('ix_submissions_status_final_score', 'submissions', ['status', 'final_score'], unique=False)

    # 4. Create payments table
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('competition_id', sa.Integer(), nullable=False),
        sa.Column('submission_id', sa.Integer(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('type', sa.Enum('entry_fee', 'prize_payout', 'refund', name='paymenttype', create_type=False), nullable=False),
        sa.Column('status', sa.Enum('pending', 'completed', 'failed', 'refunded', name='paymentstatus', create_type=False), nullable=False, server_default='pending'),
        sa.Column('stripe_payment_intent_id', sa.String(length=255), nullable=True),
        sa.Column('stripe_transfer_id', sa.String(length=255), nullable=True),
        sa.Column('processed_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['competition_id'], ['competitions.id'], ),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'], unique=False)
    op.create_index(op.f('ix_payments_user_id'), 'payments', ['user_id'], unique=False)
    op.create_index(op.f('ix_payments_competition_id'), 'payments', ['competition_id'], unique=False)
    op.create_index(op.f('ix_payments_submission_id'), 'payments', ['submission_id'], unique=False)
    op.create_index(op.f('ix_payments_type'), 'payments', ['type'], unique=False)
    op.create_index(op.f('ix_payments_status'), 'payments', ['status'], unique=False)
    op.create_index(op.f('ix_payments_stripe_payment_intent_id'), 'payments', ['stripe_payment_intent_id'], unique=False)
    op.create_index(op.f('ix_payments_stripe_transfer_id'), 'payments', ['stripe_transfer_id'], unique=False)
    op.create_index('ix_payments_user_status', 'payments', ['user_id', 'status'], unique=False)
    op.create_index('ix_payments_competition_type', 'payments', ['competition_id', 'type'], unique=False)
    op.create_index('ix_payments_status_type', 'payments', ['status', 'type'], unique=False)

    # 5. Create judge_assignments table
    op.create_table(
        'judge_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('judge_id', sa.Integer(), nullable=False),
        sa.Column('submission_id', sa.Integer(), nullable=False),
        sa.Column('assigned_by', sa.Integer(), nullable=False),
        sa.Column('assigned_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['judge_id'], ['users.id'], ),
        sa.ForeignKeyConstraint(['submission_id'], ['submissions.id'], ),
        sa.ForeignKeyConstraint(['assigned_by'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('judge_id', 'submission_id', name='uq_judge_submission')
    )
    op.create_index(op.f('ix_judge_assignments_id'), 'judge_assignments', ['id'], unique=False)
    op.create_index('ix_judge_assignments_judge_id', 'judge_assignments', ['judge_id'], unique=False)
    op.create_index('ix_judge_assignments_submission_id', 'judge_assignments', ['submission_id'], unique=False)
    op.create_index('ix_judge_assignments_assigned_by', 'judge_assignments', ['assigned_by'], unique=False)

    # 6. Create password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('token', sa.String(length=255), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('used', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_password_reset_tokens_id'), 'password_reset_tokens', ['id'], unique=False)
    op.create_index('ix_password_reset_tokens_token', 'password_reset_tokens', ['token'], unique=True)
    op.create_index('ix_password_reset_tokens_user_id', 'password_reset_tokens', ['user_id'], unique=False)
    op.create_index('ix_password_reset_tokens_expires_at', 'password_reset_tokens', ['expires_at'], unique=False)

    # 7. Create user_bank_accounts table
    op.create_table(
        'user_bank_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('stripe_bank_account_id', sa.String(length=255), nullable=False),
        sa.Column('bank_account_last4', sa.String(length=4), nullable=False),
        sa.Column('bank_name', sa.String(length=255), nullable=True),
        sa.Column('account_holder_name', sa.String(length=255), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('verified', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_bank_accounts_id'), 'user_bank_accounts', ['id'], unique=False)
    op.create_index('ix_user_bank_accounts_user_id', 'user_bank_accounts', ['user_id'], unique=False)
    op.create_index('ix_user_bank_accounts_stripe_bank_account_id', 'user_bank_accounts', ['stripe_bank_account_id'], unique=True)
    op.create_index('ix_user_bank_accounts_is_default', 'user_bank_accounts', ['is_default'], unique=False)

    # ### end Alembic commands ###


def downgrade() -> None:
    # ### Drop all tables in reverse order ###
    op.drop_index('ix_user_bank_accounts_is_default', table_name='user_bank_accounts')
    op.drop_index('ix_user_bank_accounts_stripe_bank_account_id', table_name='user_bank_accounts')
    op.drop_index('ix_user_bank_accounts_user_id', table_name='user_bank_accounts')
    op.drop_index(op.f('ix_user_bank_accounts_id'), table_name='user_bank_accounts')
    op.drop_table('user_bank_accounts')

    op.drop_index('ix_password_reset_tokens_expires_at', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_user_id', table_name='password_reset_tokens')
    op.drop_index('ix_password_reset_tokens_token', table_name='password_reset_tokens')
    op.drop_index(op.f('ix_password_reset_tokens_id'), table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')

    op.drop_index('ix_judge_assignments_assigned_by', table_name='judge_assignments')
    op.drop_index('ix_judge_assignments_submission_id', table_name='judge_assignments')
    op.drop_index('ix_judge_assignments_judge_id', table_name='judge_assignments')
    op.drop_index(op.f('ix_judge_assignments_id'), table_name='judge_assignments')
    op.drop_table('judge_assignments')

    op.drop_index('ix_payments_status_type', table_name='payments')
    op.drop_index('ix_payments_competition_type', table_name='payments')
    op.drop_index('ix_payments_user_status', table_name='payments')
    op.drop_index(op.f('ix_payments_stripe_transfer_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_stripe_payment_intent_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_status'), table_name='payments')
    op.drop_index(op.f('ix_payments_type'), table_name='payments')
    op.drop_index(op.f('ix_payments_submission_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_competition_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_user_id'), table_name='payments')
    op.drop_index(op.f('ix_payments_id'), table_name='payments')
    op.drop_table('payments')

    op.drop_index('ix_submissions_status_final_score', table_name='submissions')
    op.drop_index('ix_submissions_user_competition', table_name='submissions')
    op.drop_index('ix_submissions_competition_status', table_name='submissions')
    op.drop_index(op.f('ix_submissions_submitted_at'), table_name='submissions')
    op.drop_index(op.f('ix_submissions_placement'), table_name='submissions')
    op.drop_index(op.f('ix_submissions_status'), table_name='submissions')
    op.drop_index(op.f('ix_submissions_user_id'), table_name='submissions')
    op.drop_index(op.f('ix_submissions_competition_id'), table_name='submissions')
    op.drop_index(op.f('ix_submissions_id'), table_name='submissions')
    op.drop_table('submissions')

    op.drop_index('ix_competitions_domain_status', table_name='competitions')
    op.drop_index('ix_competitions_status_deadline', table_name='competitions')
    op.drop_index(op.f('ix_competitions_created_by'), table_name='competitions')
    op.drop_index(op.f('ix_competitions_status'), table_name='competitions')
    op.drop_index(op.f('ix_competitions_open_date'), table_name='competitions')
    op.drop_index(op.f('ix_competitions_deadline'), table_name='competitions')
    op.drop_index(op.f('ix_competitions_domain'), table_name='competitions')
    op.drop_index(op.f('ix_competitions_id'), table_name='competitions')
    op.drop_table('competitions')

    op.drop_index(op.f('ix_users_stripe_connect_account_id'), table_name='users')
    op.drop_index(op.f('ix_users_stripe_customer_id'), table_name='users')
    op.drop_index(op.f('ix_users_role'), table_name='users')
    op.drop_index(op.f('ix_users_username'), table_name='users')
    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_index(op.f('ix_users_id'), table_name='users')
    op.drop_table('users')

    # Drop enum types
    sa.Enum(name='paymentstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='paymenttype').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='submissionstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='competitionstatus').drop(op.get_bind(), checkfirst=True)
    sa.Enum(name='userrole').drop(op.get_bind(), checkfirst=True)

    # ### end Alembic commands ###
