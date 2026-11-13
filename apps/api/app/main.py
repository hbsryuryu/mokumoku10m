import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from app.auctions import router as auctions_router
from app.auth import dev_login
from app.auth import router as auth_router
from app.bids import router as bids_router
from app.config import Settings, get_settings, validate_settings
from app.db import engine
from app.errors import install_error_handlers
from app.jobs.finalize import run_forever
from app.listings import router as listings_router


def configure_logging() -> None:
    """アプリ（app.*）のログを INFO 以上で標準エラーに出す（uvicorn のログと並べて見るため）。"""
    app_logger = logging.getLogger("app")
    if not app_logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(logging.Formatter("%(levelname)s:     [%(name)s] %(message)s"))
        app_logger.addHandler(handler)
        app_logger.setLevel(logging.INFO)


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    # ADR-0008: 本番で開発用ログインが有効になっていたら、起動そのものを拒否する。
    validate_settings(settings)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        # Feature AUC-001: 終了処理を API サーバーの中で定期実行する（ADR-0008、0 なら実行しない）
        configure_logging()
        task = None
        if settings.finalizer_interval_seconds > 0:
            logging.getLogger("app.jobs.finalize").info(
                "終了処理の定期実行を開始します（%s 秒ごと）", settings.finalizer_interval_seconds
            )
            task = asyncio.create_task(run_forever(settings.finalizer_interval_seconds))
        yield
        if task:
            task.cancel()

    app = FastAPI(title="めぐる市 API", version="0.1.0", lifespan=lifespan)
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
    app.include_router(auctions_router.router)  # Feature AUC-001
    if settings.dev_login_enabled:
        # Feature AUTH-002: APP_ENV=local のときだけここに来る（validate_settings で保証）。
        app.include_router(dev_login.router)

    return app


app = create_app()
