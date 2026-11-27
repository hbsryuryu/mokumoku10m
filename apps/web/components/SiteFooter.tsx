import Link from "next/link";

export function SiteFooter() {
  return (
    <footer id="footer">
      <div className="footer-main">
        <Link className="brand footer-brand" href="/">
          <span className="brand-mark">巡</span>
          <span>
            めぐる市<small>meguru ichi</small>
          </span>
        </Link>
        <p>
          いいものを、次の人へ。
          <br />
          ひととものがめぐるオークション。
        </p>
        <div className="footer-links">
          <Link href="/#listings">出品を探す</Link>
          <Link href="/sell">出品する</Link>
          <Link href="/me">マイページ</Link>
        </div>
      </div>
      <div className="footer-bottom">
        <span>© 2026 めぐる市</span>
        <span>個人情報保護方針　　利用規約</span>
        <span className="demo-note">開発中の画面です。実際の決済・取引は発生しません。</span>
      </div>
    </footer>
  );
}
