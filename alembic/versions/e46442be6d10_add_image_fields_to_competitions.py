"""add_image_fields_to_competitions

Revision ID: e46442be6d10
Revises: f3dd37e01796
Create Date: 2026-02-07 21:45:52.069294

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e46442be6d10'
down_revision: Union[str, None] = 'f3dd37e01796'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: image_key and image_url columns already created in initial schema (0000000000000)
    pass


def downgrade() -> None:
    # No-op: cannot drop image columns as they're part of initial schema
    pass
