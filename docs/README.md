# ドキュメント案内

このディレクトリには、オークションMVPの要件、設計判断、API案、セキュリティ方針、運用手順を記録します。ローカル画面はFastAPIと同じオリジンで配信し、開発用ログイン・出品・検索をAPIに接続しています。入札APIは実装済みですが画面では未接続です。通常の終了処理・Google認証・決済は今後の実装対象です。実装状況は [ルートのREADME](../README.md) を参照してください。

全体方針は [`../AGENTS.md`](../AGENTS.md)、ブランチ・PR などの開発の進め方は [`../CONTRIBUTING.md`](../CONTRIBUTING.md) を参照してください。

## 構成

| ディレクトリ | 内容 |
|---|---|
| [`product/`](product/) | 要件・業務ルール・画面・未決事項 |
| [`architecture/`](architecture/) | 全体構成・ドメインモデル・各機能の詳細設計 |
| [`adr/`](adr/) | 設計判断の履歴・テンプレート |
| [`api/`](api/) | API仕様・共通契約 |
| [`security/`](security/) | セキュリティ・プライバシー方針 |
| [`runbooks/`](runbooks/) | ローカル確認・本番準備手順 |
| [`testing/`](testing/) | テスト条件・期待結果・合否判定 |

## 文書一覧

### product
- [MVPスコープ](product/mvp-scope.md)：本番MVPの機能範囲
- [未定義の機能一覧（バックログ）](product/feature-backlog.md)：要件・設計がまだない機能と優先順位（管理者、マイページ、取引メッセージ、評価など）
- [プロトタイプ要件と受け入れ条件](product/prototype-requirements.md)：現在の静的プロトタイプの範囲
- [オークションサイト仕様書](product/auction-site-spec.md)：本番MVPの要求仕様
- [Yahoo!オークションとの仕様比較](product/yahoo-auctions-alignment.md)：参考サービスの仕様（確認日つき）と、めぐる市の扱い
- [AUTH-001: Google ログイン（要件）](product/auth-001-google-login.md)：提案中
- [オークション業務ルール](product/auction-rules.md)
- [画面一覧](product/screens.md)
- [実装ロードマップ](product/roadmap.md)
- [未決事項](product/open-questions.md)

### architecture
- [全体構成](architecture/overview.md)、[ドメインモデル](architecture/domain-model.md)
- [データベースのテーブル設計](architecture/database-schema.md)：テーブル・列・制約と実装状況
- [入札・終了処理のトランザクション仕様](architecture/auction-bid-transaction.md)
- [AUTH-001: Google ログイン（設計）](architecture/auth-001-google-login-design.md)：提案中

### adr

設計判断の履歴（[テンプレート](adr/template.md)）。

#### ADR の階層

ADR は決め事の粒度で3階層に分ける。ファイルの場所と番号は階層に関係なく `adr/` 直下の連番のままとし、各 ADR の冒頭に「階層」と「上位」を書く。

| 階層 | 何を決めるか | 変わりやすさ・変更の手続き |
|---|---|---|
| L1 方針 | プロダクト全体や複数の機能を縛る原則（参考サービス、認証方式、スコープなど） | ほとんど変えない。変更は3人全員の合意 |
| L2 決定 | L1 の下で、1つの領域の具体的なルールや技術を決める。「業務ルール」と「技術」に分ける | 根拠（上位の L1 や前提）が変わったときに見直す |
| L3 仮決め | 実装を進めるための暫定値（上限値、開発用の仕組みなど） | 実装しながら見直す前提。正式に決めたら L2 で置き換える |

**L1 方針**

| 番号 | タイトル | 状態 |
|---|---|---|
| [ADR-0002](adr/0002-prototype-scope.md) | 最初の成果物を静的フロントエンドにする | 採用（プロトタイプ範囲） |
| [ADR-0003](adr/0003-production-stack-pending.md) | 本番技術スタックと未決プロダクト事項を保留する | 提案 |
| [ADR-0005](adr/0005-google-only-authentication.md) | Google認証に一本化する | 採用 |
| [ADR-0007](adr/0007-align-with-yahoo-auctions.md) | オークションの仕様を Yahoo!オークションに合わせる（§2〜8 は業務ルールの詳細を含む） | 採用（方針） |

**L2 決定（業務ルール）**

| 番号 | タイトル | 上位 | 状態 |
|---|---|---|---|
| [ADR-0004](adr/0004-auction-operating-rules.md) | MVPオークションの入札・終了・出品変更ルール | ADR-0007 | 一部置き換え（入札・終了は ADR-0007） |
| [ADR-0009](adr/0009-fees.md) | 手数料は落札時のみ、落札価格の10%（税込）とする | ADR-0007 | 提案中 |

**L2 決定（技術）**

| 番号 | タイトル | 上位 | 状態 |
|---|---|---|---|
| [ADR-0001](adr/0001-backend-framework.md) | バックエンドフレームワーク（FastAPI。Hono はサブ候補） | ADR-0003 | 採用 |
| [ADR-0006](adr/0006-database-sqlite-to-postgresql.md) | データベースは SQLite3 で始め、PostgreSQL に移行する | ADR-0003 | 採用（ORM は SQLAlchemy 2.x + Alembic） |
| [ADR-0010](adr/0010-web-frontend-nextjs.md) | Web フロントエンドは Next.js で作る | ADR-0003 | 採用（スタイリング等は最初の実装で決める） |

**L3 仮決め**

| 番号 | タイトル | 上位 | 状態 |
|---|---|---|---|
| [ADR-0008](adr/0008-mvp-implementation-provisional-decisions.md) | 出品・入札・落札の実装を始めるための仮決め | ADR-0004、0005、0006、0007 | 採用（仮決め） |

**今後の整理候補**（採用済みの ADR は書き換えず、新しい ADR で置き換える）

- ADR-0007 は L1 の方針（§1）と L2 の業務ルール（§2〜8）が1本に入っている。ルールを変えるときに、§2〜8 を L2 の ADR として切り出す。
- ADR-0008 は認証・出品・終了処理の仮決めが1本に入っている。正式に決めた項目から、領域ごとの L2 の ADR で置き換える。

### その他
- [オークションサービス テスト仕様書](testing/auction-test-cases.md)：正常系・異常系・境界値・競合・主要フローと仕様確認項目
- [API仕様書](api/openapi.md)、[出品 API](api/listings.md)、[入札 API](api/bids.md)、[終了処理・早期終了](api/auctions.md)、[API文書案内](api/README.md)
- [セキュリティ・プライバシー方針](security/security-and-privacy.md)
- [ローカル開発手順（バックエンド API）](runbooks/local-backend.md)、[ローカル運用手順（静的デモ）](runbooks/local-prototype.md)、[本番準備](runbooks/production-readiness.md)、[運用文書案内](runbooks/README.md)

## 書き方ルール

- 文書は原則として `docs/<分類>/<文書>.md` に置き、分類の下にさらにフォルダを作らない。計画文書は `product/`、詳細設計は `architecture/`、設計判断の履歴は `adr/` にまとめる。
- 日本語で記録し、ファイル名は英小文字のケバブケースにする。
- 未確定の内容は「未決」「TBD」「将来案」と明記し、確定仕様として実装しない。
- 設計判断は `adr/NNNN-タイトル.md` に記録する。番号は既存の最大番号 +1 とし、作成前に `main` を最新化して重複がないか確認する。
- ADR には「階層」（L1 方針 / L2 決定 / L3 仮決め）と「上位」の ADR を書き、上の ADR 一覧の該当する階層の表に追加する（[ADR の階層](#adr-の階層)）。
- 同じテーマの文書を新しく作る前に、既存の文書がないか確認し、あれば追記する。
- 仕様やルールを変えたら、関連する文書も同じ PR で更新する。
