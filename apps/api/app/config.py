from functools import lru_cache
from urllib.parse import urlsplit

from pydantic import Field
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
    google_client_id: str = ""
    google_client_secret: str = Field(default="", repr=False)
    google_redirect_uri: str = ""
    web_origin: str = "http://localhost:3000"

    @property
    def google_enabled(self) -> bool:
        return bool(self.google_client_id and self.google_client_secret and self.google_redirect_uri)
    # ローカル画面の配信元。Dockerでは /frontend を指定する。
    frontend_directory: str | None = None

    # ローカルの Origin チェックで、API 自身に加えて許可する接続元（カンマ区切り）。
    # Next.js（apps/web、ADR-0010）の開発サーバーから /api/* を転送するときに、ブラウザの Origin
    # （例: http://localhost:3000）がそのまま届くため、ここで許可する。
    allowed_origins: str = ""

    @property
    def allowed_origin_set(self) -> set[str]:
        return {o.strip().rstrip("/") for o in self.allowed_origins.split(",") if o.strip()}

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
    if settings.google_enabled:
        for value in (settings.web_origin, settings.google_redirect_uri):
            parsed = urlsplit(value)
            local_http = settings.is_local and parsed.scheme == "http" and parsed.hostname in {"localhost", "127.0.0.1"}
            if (not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment
                    or (parsed.scheme != "https" and not local_http)):
                raise UnsafeSettingsError("Google認証のURL設定が不正です（本番はHTTPS必須）")
        if urlsplit(settings.web_origin).path not in {"", "/"}:
            raise UnsafeSettingsError("WEB_ORIGINにはパスを含めないでください")
        if urlsplit(settings.google_redirect_uri).path != "/api/v1/auth/google/callback":
            raise UnsafeSettingsError("GOOGLE_REDIRECT_URIのパスが認証APIと一致しません")
        if urlsplit(settings.web_origin).hostname != urlsplit(settings.google_redirect_uri).hostname:
            raise UnsafeSettingsError("Google認証の戻り先と画面は同じホスト名にしてください")


@lru_cache
def get_settings() -> Settings:
    return Settings()
