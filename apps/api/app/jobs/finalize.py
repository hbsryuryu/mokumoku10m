"""Feature AUC-001: 終了処理の実行（定期実行と手動実行）。

- 定期実行：API サーバーの起動中、`FINALIZER_INTERVAL_SECONDS` ごとに実行する（ADR-0008。0 で止める）
- 手動実行：`python -m app.jobs.finalize`（Docker では `docker compose run --rm api python -m app.jobs.finalize`）

何度実行しても、同じオークションの落札・Order は1回しか確定しない（app.auctions.service）。
"""

import asyncio
import logging
from collections import Counter

from app.auctions.service import FinalizeResult, finalize_due_auctions
from app.db import SessionLocal

logger = logging.getLogger(__name__)


def run_once() -> list[FinalizeResult]:
    with SessionLocal() as db:
        results = finalize_due_auctions(db)
    if results:
        logger.info("終了処理: %s", dict(Counter(r.outcome for r in results)))
    return results


async def run_forever(interval_seconds: int) -> None:
    """API サーバーの中で、終了処理を一定間隔で実行し続ける。"""
    while True:
        try:
            # DB の処理は同期なので、イベントループを止めないよう別スレッドで動かす
            await asyncio.to_thread(run_once)
        except Exception:
            logger.exception("終了処理の定期実行でエラーが起きました。次の間隔で再試行します")
        await asyncio.sleep(interval_seconds)


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    results = run_once()
    counts = Counter(r.outcome for r in results)
    print(f"処理したオークション: {len(results)} 件 {dict(counts)}")


if __name__ == "__main__":
    main()
