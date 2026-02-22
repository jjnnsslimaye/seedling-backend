"""add_stripe_customer_id_to_users

Revision ID: 49d6a94d8830
Revises: 071124476b7f
Create Date: 2025-12-28 23:12:35.270319

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '49d6a94d8830'
down_revision: Union[str, None] = '071124476b7f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: stripe_customer_id column and index already created in initial schema (0000000000000)
    pass


def downgrade() -> None:
    # No-op: cannot drop stripe_customer_id column as it's part of initial schema
    pass
