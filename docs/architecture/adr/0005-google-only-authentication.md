# ADR-0005: Google認証に一本化する

- 状態: 採用（MVPの認証要件）
- 日付: 2026-10-30
- 備考: 当初 `docs/architecture/ADR-0004-google-only-authentication.md` として追加。ADR の置き場所を `adr/` に統一し、番号を連番にするため ADR-0005 に振り直し（内容は変更なし）
- 決定者: プロダクトオーナーの依頼に基づき仕様化
- 関連: [`オークションサイト仕様書`](../../product/auction-site-spec.md)、[`セキュリティ方針`](../../security/security-and-privacy.md)、[`API設計案`](../../api/openapi.md)

## 背景

会員ログイン方式をGoogle認証に一本化する要件が示された。メール/パスワードを別に運用せず、利用者がGoogleアカウントで認証する。

## 決定

- 一般会員と運営者の認証プロバイダーはGoogleのみとする。メール/パスワード、他社ソーシャルログイン、独自のパスワード再設定は提供しない。
- Google OpenID Connect (OIDC) を使う。認証フローはAuthorization Code Flow + PKCEを採用し、`state` と `nonce` を検証する。
- IDトークンはバックエンドで署名、issuer、audience（登録済みClient ID）、有効期限、nonceを検証する。未検証トークンを会員識別や認可に使わない。
- 会員の認証IDはGoogleの `sub` を用い、`provider=google` と `subject=sub` の一意なAuthIdentityとして保存する。メールアドレスを主キーや自動アカウント統合キーにしない。
- 入札・出品を有効にする会員は `email` があり `email_verified=true` のGoogle IDトークンを必要とする。別途メール確認メールは送らない。
- 初回Google認証時に会員を作成し、以後は一致するGoogle `sub` の既存会員としてログインする。異なる `sub` は、メールアドレスが同じでも自動で既存会員へ統合しない。
- Google認証成功後、アプリは独自のセッションを発行する。Google IDトークンをアプリの長期セッションとして保存・使用しない。Cookieを使う場合はSecure、HttpOnly、適切なSameSite属性、CSRF対策を適用する。
- ログアウトではアプリセッションを失効させる。Googleアカウント自体のログアウトやGoogle権限の全撤回は行わない。
- OAuth Client Secret等はサーバー側の秘密情報として管理し、ブラウザ・Git・ログに出さない。要求スコープは `openid email profile` に限定し、Google APIの追加データアクセスを要求しない。
- Google認証はGoogleアカウントの認証であり、法的本人確認/KYCを満たすものではない。

## 理由

- 認証方式を一つにすることで、パスワード保管・再設定・メール確認の独自運用を減らす。
- Googleの不変なアカウント識別子 `sub` を使うことで、メールアドレス変更を会員IDの変更や誤ったアカウント統合につなげない。
- トークン検証とアプリセッションをサーバー側で行い、クライアントが送るユーザーIDや未検証トークンを信用しない。

## 影響・残る判断

- Googleアカウントを持たない、または利用できない利用者はログインできない。代替認証手段はMVPでは提供しない。
- OAuth/OIDC対応の認証ライブラリまたは認証サービス、Client ID発行・Google Cloud設定、リダイレクトURI、セッション保管方式、セッション有効期間・更新・全端末ログアウトは別途技術選定が必要。
- Googleアカウントを失った場合、本人確認なしのメール一致だけでアカウントを復旧・統合しない。サポートによる例外手順は別途定義する。
- Googleプロフィールの表示名・画像を初期値に使う場合も、公開プロフィールと連絡先メールの表示/編集設定は別途定義する。
- 利用停止・退会状態はGoogleログイン成功より優先し、停止中会員にはアプリセッションを付与しない、または機能を制限する。

## 参照

- [Google OpenID Connect: IDトークン検証と `sub` の扱い](https://developers.google.com/identity/openid-connect/openid-connect)
- [Google: バックエンドサーバーで認証する](https://developers.google.com/identity/sign-in/web/backend-auth)
