"""change_judge_feedback_to_json

Revision ID: 727af58366ab
Revises: d4181ab6fdc9
Create Date: 2025-12-21 17:14:16.135838

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '727af58366ab'
down_revision: Union[str, None] = 'd4181ab6fdc9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # No-op: submissions.status and judge_feedback already created with correct types in initial schema (0000000000000)
    # status already created as Enum, judge_feedback already created as JSON
    pass


def downgrade() -> None:
    # No-op: cannot alter column types as they're part of initial schema
    pass
