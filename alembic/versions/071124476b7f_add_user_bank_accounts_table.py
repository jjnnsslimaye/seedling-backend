"""add_user_bank_accounts_table

Revision ID: 071124476b7f
Revises: 70cd1ed68acd
Create Date: 2025-12-28 22:42:52.709652

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '071124476b7f'
down_revision: Union[str, None] = '70cd1ed68acd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: user_bank_accounts table already created in initial schema (0000000000000)
    pass


def downgrade() -> None:
    # No-op: cannot drop user_bank_accounts table as it's part of initial schema
    pass
