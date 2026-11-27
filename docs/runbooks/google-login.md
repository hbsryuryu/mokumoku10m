# Googleログインの設定・確認・復旧

## 設定と起動

Google Auth PlatformでWeb用OAuthクライアントを作成し、リダイレクトURIに `http://localhost:8000/api/v1/auth/google/callback` を登録する。要求スコープはopenid・email・profileだけ。

ルートの `.env` に発行した `GOOGLE_CLIENT_ID` と `GOOGLE_CLIENT_SECRET` を入力し、`GOOGLE_REDIRECT_URI` を上記と一致させる。秘密はログ・チャット・Gitに出さない。`WEB_ORIGIN` は認証後に戻る画面のオリジン（既定 `http://localhost:3000`）。WEB_PORTを変える場合も合わせる。

`docker compose up -d --build` で認証テーブルを追加して起動し、http://localhost:3000/login の「Googleでログイン」を選ぶ。Google画面でアカウントを選択し、初回はサイトに戻って公開ニックネームを設定する。開発用ログインとGoogle会員は別の会員で、同名や同メールで自動統合しない。

## 確認

- `/api/v1/auth/options` のgoogleEnabledがtrueであることを確認する。秘密の値を表示する `docker compose config` 等は確認に使わない。
- 初回登録・再ログイン・ニックネーム保存・ログアウト、停止済み会員の拒否を確認する。
- Google画面のキャンセル、10分経過、callbackの再送はログイン完了せず、新しい開始操作からやり直せることを確認する。
- Next.js開発サーバーはGoogle認証経路のアクセスログを除外し、APIはクエリを秘匿する。本番の入口プロキシでもcallbackのクエリを記録しない設定を確認する。
- 自動テストは `docker compose exec -T api pytest -q`、画面の型チェックは `docker compose exec -T web npm run typecheck`。
- Google本人のパスワードや多要素認証の入力は利用者本人が行う。模擬署名・ネットワーク応答を使う自動テストの成功と、Google実アカウントでの完了確認を区別する。

## トラブル対応

| 状況 | 確認すること |
|---|---|
| Googleボタンが出ない | 3つのGOOGLE設定がすべて有効か、APIを再作成したか。`docker compose up -d --build api` で反映 |
| redirect_uri_mismatch | Googleの登録URIとGOOGLE_REDIRECT_URIのポート・パス・末尾スラッシュの一致 |
| state・Cookieの照合に失敗 | localhostと127.0.0.1を混在させていないか、別ブラウザにcallbackをコピーしていないか。新しくログインを開始 |
| 連続操作で429 | 1分待ってから再実行。プロキシ経由では接続元が共有される場合がある |
| Google障害・期限切れ | 新規にログイン開始。認証コードの再送やCookie・DBの手編集は行わない |

## DB変更と復旧

Migration 0004は `oauth_attempts` テーブルのみ追加し、既存のUser・AuthIdentity・Session・出品・入札・Orderを変更しない。認証中のデータは最大10分有効で、消費時・次回開始時の期限切れ掃除で削除する。PKCE verifierを含むためDB・バックアップへのアクセスを制限する。

旧版へ戻す場合は新規ログイン開始を停止し、進行中のGoogleログインが失敗することを案内する。旧コードへ戻すだけなら追加テーブルを残してもよい。テーブルを戻す必要がある場合のみ、停止・バックアップ後に対応版のAlembicで `alembic downgrade 0003` を行う。削除対象は認証途中の要求のみで、会員やセッション、取引記録は削除しない。

本番公開には共有レート制限、プロキシ・TLS、監視、データ保持、障害対応の確認が別途必要。ここでのローカル認証確認を本番公開の承認として扱わない。

ブラウザ検証は `apps/web/e2e/google-login.cjs`。一時インストールのPlaywrightをNODE_PATHに指定して実行する。Googleへの遷移先を捕捉し、本人のパスワード・同意は操作しない。初回設定画面の検証は模擬会員を使い、実DBに架空のGoogle会員を作らない。
