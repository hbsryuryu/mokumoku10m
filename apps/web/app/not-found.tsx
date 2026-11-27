import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page">
      <h1>ページが見つかりません</h1>
      <p className="page-lead">出品が終了・取り下げされたか、URL が間違っている可能性があります。</p>
      <Link className="text-link" href="/">
        トップへ戻る
      </Link>
    </main>
  );
}
