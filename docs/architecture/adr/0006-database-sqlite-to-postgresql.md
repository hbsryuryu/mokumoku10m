# ADR-0006: データベースは SQLite3 で始め、PostgreSQL に移行する

- 状態: 採用（SQLite3 → PostgreSQL の段階移行。ORM の選定は合意待ち）
- 日付: 2026-10-31
- 決定者: hbsryuryu（チームでの確認は PR で行う）
- 関連: [ADR-0001](0001-backend-framework.md)（FastAPI）、[ADR-0003](0003-production-stack-pending.md)（本番スタック保留）、[ADR-0004](0004-auction-operating-rules.md)（入札の直列化）、[`../overview.md`](../overview.md)
- 入札書込みの論理契約: [入札・終了処理のトランザクション仕様](../designs/auction-bid-transaction.md)

## 背景

AGENTS.md 3章では、データベースの初期候補を PostgreSQL としていた（採用済みの決定ではない）。
一方で、学習目的の3人チームとしては、最初はサーバーを立てずにすぐ動かせる環境で、API とドメインロジックの開発を始めたい。

## 決定

1. **開発初期は SQLite3 を使う。** DB サーバーは不要で、ファイル1つで動く。
2. **staging / production の前に PostgreSQL に移行する。** 移行するタイミングは「移行する条件」を参照。
3. **2つの DB の違いを吸収するため、ORM とマイグレーションツールを使い、DB 固有の機能をアプリのコードに直接書かない。**
   - **ORM の候補は SQLAlchemy 2.x + Alembic とする（この PR で合意したい論点）。** SQLModel も SQLAlchemy の上に作られているので、使う場合も Alembic でマイグレーションを管理する。
   - 生の SQL を書く場合は、両方の DB で動く書き方に限る。

## SQLite3 で開発するときのルール

PostgreSQL への移行を楽にするため、また SQLite3 の弱点で不具合を作らないために、次を守る。

| 項目 | ルール | 理由 |
|---|---|---|
| 外部キー | 接続ごとに `PRAGMA foreign_keys = ON` を設定する | SQLite3 は標準では外部キー制約を確認しない |
| 同時アクセス | `PRAGMA journal_mode = WAL` を使う | 書き込み中でも読み込みができる |
| 入札の直列化 | 入札の受付は書き込みトランザクションを最初に取る形（`BEGIN IMMEDIATE`）で行う。PostgreSQL ではオークション行を `SELECT ... FOR UPDATE` でロックする。**この違いは「入札受付用のロックを取る」関数1か所に閉じ込める** | SQLite3 には行ロック（`FOR UPDATE`）がなく、DB 全体で書き込みが1つずつになる |
| 型 | 金額は整数（円）、真偽値は 0 / 1。テーブル定義は ORM で型をはっきり書き、`CHECK` 制約も使う | SQLite3 は型の扱いがゆるく、違う型の値も入ってしまう |
| 日時 | UTC で保存する（ISO 8601 の文字列か UNIX 時刻）。タイムゾーン付きの型には頼らない | SQLite3 には日時専用の型がない |
| マイグレーション | Alembic の batch モード（`render_as_batch=True`）を使う | SQLite3 は `ALTER TABLE` でできる変更が少ない |
| 検索 | 当初は `LIKE` による簡単な検索にする。全文検索は PostgreSQL に移行してから実装する | SQLite3 の FTS5 と PostgreSQL の全文検索は書き方がまったく違う |
| DB ファイル | `*.sqlite3` は Git にコミットしない。Docker では named volume に置く | 個人のテストデータを共有しないため。Windows のフォルダを直接マウントすると、ファイルロックが不安定になることがあるため |

## 移行する条件

次のどれかに当てはまったら PostgreSQL に移行する（移行作業は別の PR で行う）。

- staging または production の環境を作るとき（**SQLite3 のまま公開しない**）
- アプリやワーカーを複数のプロセス・サーバーで動かすとき
- 全文検索、行ロックなど、PostgreSQL の機能が必要になったとき
- 書き込みの待ちで、開発やテストに支障が出たとき

## 理由

- SQLite3 は Python に標準で入っていて、DB サーバーを立てずにすぐ開発を始められる。学習の最初の負担が小さい。
- SQLAlchemy + Alembic を使えば、同じモデル定義とマイグレーションを PostgreSQL でもほぼそのまま使える。
- 本番では、AGENTS.md 5章の要件（同時入札の直列化、ユニーク制約、終了処理の冪等性）を行ロックで素直に実装できる PostgreSQL が向いている。

## 影響

- **入札の同時実行テスト（AGENTS.md 9章）**：SQLite3 では行ロックの動きを確認できない。PostgreSQL 版の統合テスト（CI で PostgreSQL を起動する）は、遅くとも移行前に用意する。
- **ローカル開発環境**：Docker Compose では、最初は DB コンテナなしで動かす。PostgreSQL のコンテナは、移行の準備ができたら追加する（コメントアウトや profile で用意しておいてもよい）。
- **ワーカー（終了処理・通知）**：SQLite3 の間は、API と同じプロセスで動かすか、書き込みが重ならないようにする。
- **データ**：開発初期のデータは移行しない（作り直す）前提。production の前に移行するので、本番データの移行は発生しない。
- **更新した文書**：`AGENTS.md` 3章の表、`../overview.md`、`0003-production-stack-pending.md`、`../../README.md`。

## 見直す条件

- 移行する条件に当てはまったとき（そのときは本 ADR を「移行完了」に更新するか、移行手順の ADR を追加する）
- SQLite3 と PostgreSQL の違いを吸収するコストが大きくなりすぎたとき（最初から PostgreSQL に切り替える）
