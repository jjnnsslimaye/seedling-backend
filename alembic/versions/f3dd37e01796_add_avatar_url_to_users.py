"""add_avatar_url_to_users

Revision ID: f3dd37e01796
Revises: 3c7913adeaac
Create Date: 2026-01-30 06:50:12.232372

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f3dd37e01796'
down_revision: Union[str, None] = '3c7913adeaac'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: avatar_url column already created in initial schema (0000000000000)
    pass


def downgrade() -> None:
    # No-op: cannot drop avatar_url column as it's part of initial schema
    pass
