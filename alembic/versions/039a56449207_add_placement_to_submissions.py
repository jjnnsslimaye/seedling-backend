"""add_placement_to_submissions

Revision ID: 039a56449207
Revises: d8c438e1a176
Create Date: 2025-12-26 07:34:28.593593

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '039a56449207'
down_revision: Union[str, None] = 'd8c438e1a176'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: placement column and index already created in initial schema (0000000000000)
    pass


def downgrade() -> None:
    # No-op: cannot drop placement column as it's part of initial schema
    pass
