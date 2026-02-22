"""add_user_role_field

Revision ID: d4181ab6fdc9
Revises: 
Create Date: 2025-12-20 12:42:05.148089

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd4181ab6fdc9'
down_revision: Union[str, None] = '0000000000000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: role column and index already created in initial schema (0000000000000)
    # This migration originally added the role column, but it's now part of the base schema
    pass


def downgrade() -> None:
    # No-op: cannot remove role column as it's part of initial schema
    pass
