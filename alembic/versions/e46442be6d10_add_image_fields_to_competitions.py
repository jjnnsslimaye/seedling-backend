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
    op.add_column('competitions', sa.Column('image_key', sa.String(length=255), nullable=True))
    op.add_column('competitions', sa.Column('image_url', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('competitions', 'image_url')
    op.drop_column('competitions', 'image_key')
