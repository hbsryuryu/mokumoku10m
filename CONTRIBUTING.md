# 開発の進め方（CONTRIBUTING）

3人チームで安全に開発するための運用ルールです。プロダクト・設計の方針は [`AGENTS.md`](AGENTS.md)、ドキュメントの書き方は [`docs/README.md`](docs/README.md) を参照してください。

> **状態: 提案中。** この PR をチーム全員が読み、認識を合わせてからマージします。マージ後はこのルールで運用します。

## 基本ルール

1. **`main` に直接 push しない。** 変更は必ず作業用ブランチ → PR → レビュー → マージ の流れで入れる。
2. **`main` で force push や履歴の書き換えをしない。** 他のメンバーのコミットが消えるため。
3. **PR は小さく。** 1つの PR は1つの目的にする（例：「docs 整理」と「入札ロジック修正」は分ける）。

## 作業の流れ

```bash
# 1. 作業前に main を最新にする
git switch main
git pull

# 2. 作業用ブランチを作る
git switch -c docs/xxx

# 3. 編集してコミット（何度でも可）
git add <ファイル>
git commit -m "docs: ○○を追加"

# 4. push 前に最新の main を取り込む（コンフリクトはここで解消）
git fetch origin
git rebase origin/main

# 5. ブランチを push して PR を作成
git push -u origin docs/xxx
gh pr create --base main      # またはブラウザで表示される URL から作成
```

`main` への push が `rejected (non-fast-forward)` で拒否された場合は、手順2以降と同じく「今のコミットをブランチにする → `git rebase origin/main` → ブランチを push → PR」で対応する。

## ブランチ名

`種類/内容` の形式。内容は英小文字とハイフン。

| 種類 | 用途 | 例 |
|---|---|---|
| `feat/` | 機能追加 | `feat/bid-dialog` |
| `fix/` | バグ修正 | `fix/first-bid-minimum` |
| `docs/` | ドキュメント | `docs/auction-rules` |
| `refactor/` | 動作を変えない整理 | `refactor/split-app-js` |
| `chore/` | 設定・依存など | `chore/add-eslint` |

## コミットメッセージ

`種類: 変更内容`（日本語可）。何をなぜ変えたかが後から分かるように書く。

- 良い例：`docs: ADR の番号重複を解消`、`fix: 初回入札の最低額を開始価格に修正`
- 避ける例：`update`、`gpt made`、`修正`

AI ツールで作成した変更も、人が内容を確認してからコミットし、メッセージには変更内容を書く。

## PR とレビュー

- PR の説明はテンプレート（[`.github/pull_request_template.md`](.github/pull_request_template.md)）に沿って書く。
- **作成者以外の1人以上**がレビューし、Approve してからマージする。
- 仕様・設計に関わる PR（入札ルール、ADR の採用など）は **3人全員** が確認してからマージする。
- 議論は PR のコメントに残す（口頭で決めたことも要点をコメントに書く）。
- マージ後、不要になったブランチは削除する。

## ADR（設計判断の記録）

- `docs/architecture/adr/NNNN-タイトル.md` に作成する（[テンプレート](docs/architecture/adr/template.md)）。
- 番号は既存の最大番号 +1。作成前に `main` を最新化し、他の PR と番号が重複していないか確認する。
- 状態は「提案中 → 採用 / 却下」。採用はチームの合意を PR で確認してから変更する。

## 今後検討すること

- GitHub のブランチ保護（`main` への直接 push 禁止、Approve 必須）を設定するか
- マージ方法（Merge commit / Squash）を統一するか
