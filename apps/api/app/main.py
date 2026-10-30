from fastapi import FastAPI
from sqlalchemy import text

from app.db import engine

app = FastAPI(title="めぐる市 API", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    """API と DB に接続できるかを返す。"""
    with engine.connect() as connection:
        connection.execute(text("SELECT 1"))
    return {"status": "ok", "database": engine.dialect.name}
