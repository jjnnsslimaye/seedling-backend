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
    # SQLite doesn't support ALTER COLUMN, so we use batch operations
    with op.batch_alter_table('submissions', schema=None) as batch_op:
        batch_op.alter_column('status',
                   existing_type=sa.VARCHAR(length=12),
                   type_=sa.Enum('DRAFT', 'PENDING_PAYMENT', 'SUBMITTED', 'UNDER_REVIEW', 'WINNER', 'REJECTED', name='submissionstatus'),
                   existing_nullable=False)
        batch_op.alter_column('judge_feedback',
                   existing_type=sa.TEXT(),
                   type_=sa.JSON(),
                   existing_nullable=True)


def downgrade() -> None:
    # SQLite doesn't support ALTER COLUMN, so we use batch operations
    with op.batch_alter_table('submissions', schema=None) as batch_op:
        batch_op.alter_column('judge_feedback',
                   existing_type=sa.JSON(),
                   type_=sa.TEXT(),
                   existing_nullable=True)
        batch_op.alter_column('status',
                   existing_type=sa.Enum('DRAFT', 'PENDING_PAYMENT', 'SUBMITTED', 'UNDER_REVIEW', 'WINNER', 'REJECTED', name='submissionstatus'),
                   type_=sa.VARCHAR(length=12),
                   existing_nullable=False)
