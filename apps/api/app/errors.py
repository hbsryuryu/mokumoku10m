"""API の共通エラー形式（docs/api/openapi.md「共通契約」）。

すべてのエラーを `{"error": {"code": "...", "message": "...", "details": {...}}}` の形で返す。
"""

from typing import Any

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


class ApiError(Exception):
    def __init__(
        self,
        status_code: int,
        code: str,
        message: str,
        details: dict[str, Any] | None = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or {}


def error_body(code: str, message: str, details: dict[str, Any] | None = None) -> dict[str, Any]:
    return {"error": {"code": code, "message": message, "details": details or {}}}


# よく使うエラー
def not_authenticated() -> ApiError:
    return ApiError(status.HTTP_401_UNAUTHORIZED, "NOT_AUTHENTICATED", "ログインしてください")


def not_found(message: str = "見つかりません") -> ApiError:
    # 他人の下書きなど「存在を知られたくないもの」にも 404 を返す（IDOR 対策）。
    return ApiError(status.HTTP_404_NOT_FOUND, "NOT_FOUND", message)


def install_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def handle_api_error(_request: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(status_code=exc.status_code, content=error_body(exc.code, exc.message, exc.details))

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(_request: Request, exc: RequestValidationError) -> JSONResponse:
        fields = [
            {"field": ".".join(str(part) for part in err["loc"][1:]), "message": err["msg"]}
            for err in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content=error_body("VALIDATION_ERROR", "入力内容を確認してください", {"fields": fields}),
        )

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(_request: Request, exc: StarletteHTTPException) -> JSONResponse:
        # 存在しない URL（404）や許可されていないメソッド（405）も同じ形式にそろえる。
        code = {404: "NOT_FOUND", 405: "METHOD_NOT_ALLOWED"}.get(exc.status_code, "HTTP_ERROR")
        return JSONResponse(status_code=exc.status_code, content=error_body(code, str(exc.detail)))
