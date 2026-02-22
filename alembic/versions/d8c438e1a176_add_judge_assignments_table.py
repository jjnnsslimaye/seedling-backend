"""add_judge_assignments_table

Revision ID: d8c438e1a176
Revises: 727af58366ab
Create Date: 2025-12-21 23:22:12.495078

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'd8c438e1a176'
down_revision: Union[str, None] = '727af58366ab'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: judge_assignments table already created in initial schema (0000000000000)
    pass


def downgrade() -> None:
    # No-op: cannot drop judge_assignments table as it's part of initial schema
    pass
