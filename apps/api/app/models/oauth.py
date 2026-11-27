"""短時間だけ保存する、ブラウザに結び付いた一回限りの認証要求。"""

from datetime import datetime

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base, UTCDateTime


class OAuthAttempt(Base):
    __tablename__ = "oauth_attempts"

    state_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    browser_hash: Mapped[str] = mapped_column(String(64))
    nonce: Mapped[str] = mapped_column(String(128))
    verifier: Mapped[str] = mapped_column(String(128))
    return_path: Mapped[str] = mapped_column(String(2048))
    expires_at: Mapped[datetime] = mapped_column(UTCDateTime, index=True)
