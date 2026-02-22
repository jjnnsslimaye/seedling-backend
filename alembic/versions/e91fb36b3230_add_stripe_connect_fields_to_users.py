"""add_stripe_connect_fields_to_users

Revision ID: e91fb36b3230
Revises: 49d6a94d8830
Create Date: 2025-12-31 12:54:53.865445

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e91fb36b3230'
down_revision: Union[str, None] = '49d6a94d8830'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: Stripe Connect fields already created in initial schema (0000000000000)
    # stripe_connect_account_id, connect_onboarding_complete, connect_charges_enabled,
    # connect_payouts_enabled, connect_onboarded_at already exist
    pass


def downgrade() -> None:
    # No-op: cannot drop Stripe Connect fields as they're part of initial schema
    pass
