from uuid import UUID

from sqlalchemy import ColumnElement

from core.models import Document


def accessible_condition(user_id: UUID) -> ColumnElement[bool]:
    """Slim ownership predicate: a user may read a document iff they own it."""
    return Document.owner_id == user_id
