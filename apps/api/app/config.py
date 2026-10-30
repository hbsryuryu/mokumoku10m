from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """環境変数から読み込む設定。項目の一覧はリポジトリ直下の `.env.example` を参照。"""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # ADR-0006: 開発初期は SQLite3。PostgreSQL に移行するときはこの値だけを変える。
    database_url: str = "sqlite:///./app.sqlite3"


settings = Settings()
