from uuid import UUID

from sqlalchemy.orm import Session

from app.models.entities import Notification


def notify_user(
    db: Session,
    user_id: UUID,
    type_: str,
    title: str,
    body: str,
    metadata: dict | None = None,
) -> Notification:
    n = Notification(user_id=user_id, type=type_, title=title, body=body, metadata_json=metadata)
    db.add(n)
    return n