import Link from "next/link";

import { ListingCard } from "@/components/ListingCard";
import { serverFetch } from "@/lib/api-server";
import type { Category, ListingPage } from "@/lib/types";

// 公開ページなので、サーバー側で HTML を作る（検索エンジン・表示速度。ADR-0010）。
export const dynamic = "force-dynamic";

const SORTS = [
  ["ending", "終了が近い順"],
  ["newest", "新着順"],
  ["price_asc", "価格が安い順"],
  ["price_desc", "価格が高い順"],
  ["bids", "入札が多い順"],
] as const;
const CATEGORY_ICONS: Record<string, string> = {
  ファッション: "♧",
  インテリア: "⌂",
  "本・ホビー": "▤",
  家電: "◉",
  その他: "❋",
};
const PAGE_SIZE = 20;

type SearchParams = Promise<{ q?: string; categoryId?: string; sort?: string; offset?: string }>;

function href(params: Record<string, string | undefined>) {
  const query = new URLSearchParams(
    Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  return `/?${query.toString()}#listings`;
}

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const { q, categoryId, sort = "ending", offset = "0" } = await searchParams;
  const query = new URLSearchParams({ sort, limit: String(PAGE_SIZE), offset });
  if (q) query.set("q", q);
  if (categoryId) query.set("categoryId", categoryId);

  let categories: Category[] = [];
  let page: ListingPage | null = null;
  try {
    [categories, page] = await Promise.all([
      serverFetch<Category[]>("/categories"),
      serverFetch<ListingPage>(`/listings?${query.toString()}`),
    ]);
  } catch {
    page = null;
  }

  return (
    <main id="top">
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <i></i> FIND YOUR NEXT FAVORITE
          </p>
          <h1>
            好きなものが、
            <br />
            誰かの宝物に。
          </h1>
          <p className="hero-sub">
            大切にしてきたものを、次に大切にしてくれる人へ。
            <br />
            めぐる市で、新しい出会いを見つけよう。
          </p>
          <div className="hero-cta">
            <a className="primary-link" href="#listings">
              出品を見てみる <span>↗</span>
            </a>
            <span className="hero-note">登録無料・見るだけでもOK</span>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="sun"></div>
          <div className="art-label">
            GOOD THINGS
            <br />
            FIND NEW HOMES.
          </div>
          <div className="blob blob-back"></div>
          <div className="plant plant-one">
            <i></i>
            <i></i>
            <i></i>
            <b></b>
          </div>
          <div className="plant plant-two">
            <i></i>
            <i></i>
            <i></i>
            <b></b>
          </div>
          <div className="vase">
            <div className="vase-neck"></div>
            <span>✿</span>
          </div>
          <div className="book book-one"></div>
          <div className="book book-two"></div>
          <div className="art-heart">♡</div>
          <div className="art-spark">✳</div>
          <div className="art-caption">
            ひとつひとつに、
            <br />
            次のストーリーを。
          </div>
        </div>
      </section>

      <section className="category-strip" aria-label="カテゴリ">
        <div className="category-intro">
          <strong>カテゴリから探す</strong>
          <small>気になるジャンルをチェック</small>
        </div>
        <div className="category-list">
          <Link className={`category${categoryId ? "" : " active"}`} href={href({ q, sort })}>
            <span>✦</span>すべて
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              className={`category${categoryId === String(c.id) ? " active" : ""}`}
              href={href({ q, sort, categoryId: String(c.id) })}
            >
              <span>{CATEGORY_ICONS[c.name] ?? "✦"}</span>
              {c.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="listing-section" id="listings">
        <div className="section-heading">
          <div>
            <p className="eyebrow">JUST FOR YOU</p>
            <h2>{q ? `「${q}」の検索結果` : "いま、注目のアイテム"}</h2>
            <p className="section-sub">あなたの「好き」に出会えるかも。</p>
          </div>
          <nav className="sort-wrap" aria-label="並び替え">
            {SORTS.map(([value, label]) => (
              <Link
                key={value}
                href={href({ q, categoryId, sort: value })}
                aria-current={sort === value ? "page" : undefined}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>

        {page === null ? (
          <p className="notice notice-error">
            出品を読み込めませんでした。API（http://localhost:8000）が起動しているか確認してください。
          </p>
        ) : page.items.length === 0 ? (
          <div className="empty-state">
            <span>⌕</span>
            <h3>見つかりませんでした</h3>
            <p>別のキーワードやカテゴリで探すか、最初の出品をしてみましょう。</p>
            <Link href="/sell" className="text-link">
              出品する
            </Link>
          </div>
        ) : (
          <>
            <div className="listing-grid">
              {page.items.map((item) => (
                <ListingCard key={item.id} item={item} />
              ))}
            </div>
            {page.hasMore && (
              <div className="more-wrap">
                <Link
                  className="more-button"
                  href={href({ q, categoryId, sort, offset: String(Number(offset) + PAGE_SIZE) })}
                >
                  次の {PAGE_SIZE} 件 <span>↓</span>
                </Link>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
