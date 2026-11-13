from fastapi import FastAPI
from sqlalchemy import text

from app.auth import dev_login
from app.auth import router as auth_router
from app.bids import router as bids_router
from app.config import Settings, get_settings, validate_settings
from app.db import engine
from app.errors import install_error_handlers
from app.listings import router as listings_router


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    # ADR-0008: 本番で開発用ログインが有効になっていたら、起動そのものを拒否する。
    validate_settings(settings)

    app = FastAPI(title="めぐる市 API", version="0.1.0")
    # API の中で使う設定を、create_app に渡した設定にそろえる（テストで別の設定を使うため）。
    app.dependency_overrides[get_settings] = lambda: settings

    @app.get("/health")
    def health() -> dict[str, str]:
        """API と DB に接続できるかを返す。"""
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "ok", "database": engine.dialect.name, "env": settings.app_env}

    install_error_handlers(app)
    app.include_router(auth_router.router)
    app.include_router(listings_router.router)  # Feature LST-004
    app.include_router(bids_router.router)  # Feature BID-001
    if settings.dev_login_enabled:
        # Feature AUTH-002: APP_ENV=local のときだけここに来る（validate_settings で保証）。
        app.include_router(dev_login.router)

    return app


app = create_app()
