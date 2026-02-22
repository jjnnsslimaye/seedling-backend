"""add_password_reset_tokens_table

Revision ID: 3c7913adeaac
Revises: e91fb36b3230
Create Date: 2026-01-21 23:54:47.958907

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c7913adeaac'
down_revision: Union[str, None] = 'e91fb36b3230'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: password_reset_tokens table already created in initial schema (0000000000000)
    pass


def downgrade() -> None:
    # No-op: cannot drop password_reset_tokens table as it's part of initial schema
    pass
