"""会員・認証・セッションのテーブル（AUTH-001 / AUTH-002）。

設計: docs/architecture/database-schema.md、docs/architecture/auth-001-google-login-design.md
"""

from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base, UTCDateTime, utcnow

USER_STATUSES = ("active", "suspended", "withdrawn")
USER_ROLES = ("member", "admin")
AUTH_PROVIDERS = ("google", "dev")


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint(f"status IN {USER_STATUSES}", name="status"),
        CheckConstraint(f"role IN {USER_ROLES}", name="role"),
        CheckConstraint(
            "display_name IS NULL OR length(display_name) BETWEEN 1 AND 30", name="display_name_length"
        ),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    # 公開する表示名（ニックネーム）。Google の氏名は使わない（AUTH-001 FR-5）。初回は未設定。
    display_name: Mapped[str | None] = mapped_column(String(30))
    status: Mapped[str] = mapped_column(String(16), default="active")
    role: Mapped[str] = mapped_column(String(16), default="member")
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, onupdate=utcnow)

    identities: Mapped[list["AuthIdentity"]] = relationship(back_populates="user")

    @property
    def is_active(self) -> bool:
        return self.status == "active"


class AuthIdentity(Base):
    """ログイン手段と会員の対応。Google は `sub`、開発用ログインは表示名を provider_subject に入れる。"""

    __tablename__ = "auth_identities"
    __table_args__ = (
        # 同じログイン手段・同じ ID から会員が二重に作られないようにする（AUTH-001 T-03）。
        UniqueConstraint("provider", "provider_subject"),
        CheckConstraint(f"provider IN {AUTH_PROVIDERS}", name="provider"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    provider: Mapped[str] = mapped_column(String(16))
    provider_subject: Mapped[str] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(320))
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    user: Mapped[User] = relationship(back_populates="identities")


class Session(Base):
    """アプリのログインセッション。セッション ID そのものは保存せず、ハッシュ値だけを保存する。"""

    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime)
    revoked_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    user: Mapped[User] = relationship()
