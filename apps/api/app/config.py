from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """環境変数から読み込む設定。項目の一覧はリポジトリ直下の `.env.example` を参照。"""

    # 空の値（例: `DEV_LOGIN_ENABLED=`）は「未指定」として扱い、既定値を使う。
    model_config = SettingsConfigDict(env_file=".env", extra="ignore", env_ignore_empty=True)

    # 実行環境。安全のため、指定がなければ本番（production）として扱う。
    # ローカル開発では compose.yaml / .env で `local` を指定する。
    app_env: str = "production"

    # ADR-0006: 開発初期は SQLite3。PostgreSQL に移行するときはこの値だけを変える。
    database_url: str = "sqlite:///./app.sqlite3"

    # Feature AUTH-002: 開発用ログイン。APP_ENV=local のときだけ有効にできる（ADR-0008）。
    dev_login_enabled: bool = False

    # セッションの有効期間（時間）。仮の値（最後の操作からではなく、発行から30日）。
    # AUTH-001 の未決事項「セッションの有効期限」が決まったら見直す。
    session_ttl_hours: int = 24 * 30

    # Feature AUC-001: 終了処理を API サーバーの中で定期実行する間隔（秒）。0 で止める（ADR-0008）。
    finalizer_interval_seconds: int = 30

    @property
    def is_local(self) -> bool:
        return self.app_env == "local"

    @property
    def session_cookie_secure(self) -> bool:
        # ローカル（http://localhost）以外では Secure 属性を付ける。
        return not self.is_local

    @property
    def session_cookie_name(self) -> str:
        # `__Host-` 接頭辞は Secure が必須のため、ローカルでは使わない。
        return "__Host-session" if self.session_cookie_secure else "session"


class UnsafeSettingsError(RuntimeError):
    """本番で使ってはいけない設定が有効になっているときのエラー。"""


def validate_settings(settings: Settings) -> None:
    """起動前に危険な設定の組み合わせを拒否する（ADR-0008 の安全策）。"""
    if settings.dev_login_enabled and not settings.is_local:
        raise UnsafeSettingsError(
            "DEV_LOGIN_ENABLED=true は APP_ENV=local のときだけ使えます"
            f"（現在の APP_ENV={settings.app_env!r}）。"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
