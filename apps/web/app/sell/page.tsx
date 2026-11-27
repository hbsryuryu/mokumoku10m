"use client";

// 出品（LST-004）。下書きを作り、そのまま公開するか、下書きとして保存する。
// 入力の上限は ADR-0008 の仮の値（API と同じ）。最終的な確認は API が行う。

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useMe } from "@/components/MeProvider";
import { ApiError, apiFetch, apiPost, fieldErrors } from "@/lib/api-client";
import type { Category, Listing } from "@/lib/types";

const CONDITIONS = [
  ["new", "新品・未使用"],
  ["like_new", "目立った傷や汚れなし"],
  ["some_wear", "やや傷や汚れあり"],
  ["worn", "傷や汚れあり"],
] as const;
const DURATIONS = [
  [24, "1日"],
  [72, "3日"],
  [168, "7日"],
] as const;

export default function SellPage() {
  const { me, loading } = useMe();
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    condition: "like_new",
    shippingPayer: "seller",
    shippingMethod: "",
    startPriceYen: "1000",
    buyoutPriceYen: "",
    autoExtension: true,
    durationHours: "72",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiFetch<Category[]>("/categories")
      .then((list) => {
        setCategories(list);
        setForm((f) => ({ ...f, categoryId: f.categoryId || String(list[0]?.id ?? "") }));
      })
      .catch(() => setMessage("カテゴリを読み込めませんでした"));
  }, []);

  if (loading) return <main className="page">読み込み中…</main>;
  if (!me) {
    return (
      <main className="page">
        <h1>出品する</h1>
        <p className="notice notice-info">
          出品するにはログインしてください。 <Link href="/login?next=/sell">ログインへ</Link>
        </p>
      </main>
    );
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(publish: boolean) {
    setBusy(true);
    setErrors({});
    setMessage(null);
    try {
      const draft = await apiPost<Listing>("/listings", {
        title: form.title,
        description: form.description,
        categoryId: Number(form.categoryId),
        condition: form.condition,
        shippingPayer: form.shippingPayer,
        shippingMethod: form.shippingMethod,
        startPriceYen: Number(form.startPriceYen),
        buyoutPriceYen: form.buyoutPriceYen ? Number(form.buyoutPriceYen) : null,
        autoExtension: form.autoExtension,
        durationHours: Number(form.durationHours),
      });
      if (publish) {
        await apiPost(`/listings/${draft.id}/publish`, { expectedVersion: draft.version });
      }
      router.push(`/listings/${draft.id}`);
    } catch (error) {
      setErrors(fieldErrors(error));
      setMessage(error instanceof ApiError ? error.message : "保存できませんでした");
      setBusy(false);
    }
  }

  const err = (field: string) => errors[field] && <p className="field-error">{errors[field]}</p>;

  return (
    <main className="page">
      <h1>出品する</h1>
      <p className="page-lead">次に大切にしてくれる人へ、届けましょう。</p>
      <form
        className="panel form-grid"
        onSubmit={(e) => {
          e.preventDefault();
          void submit(true);
        }}
      >
        <label htmlFor="title">商品名 <small>60文字まで</small></label>
        <input id="title" className="form-input" maxLength={60} required value={form.title} onChange={set("title")} placeholder="例：木の持ち手の小さなかご" />
        {err("title")}

        <label htmlFor="description">商品の説明 <small>500文字まで</small></label>
        <textarea id="description" className="form-input" maxLength={500} rows={4} required value={form.description} onChange={set("description")} />
        {err("description")}

        <label htmlFor="category">カテゴリ</label>
        <select id="category" className="form-input" value={form.categoryId} onChange={set("categoryId")}>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        {err("categoryId")}

        <label htmlFor="condition">商品の状態</label>
        <select id="condition" className="form-input" value={form.condition} onChange={set("condition")}>
          {CONDITIONS.map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>

        <label htmlFor="shippingPayer">送料の負担</label>
        <select id="shippingPayer" className="form-input" value={form.shippingPayer} onChange={set("shippingPayer")}>
          <option value="seller">出品者が負担</option>
          <option value="buyer">落札者が負担</option>
        </select>

        <label htmlFor="shippingMethod">配送方法 <small>80文字まで</small></label>
        <input id="shippingMethod" className="form-input" maxLength={80} required value={form.shippingMethod} onChange={set("shippingMethod")} placeholder="例：ゆうパケット" />
        {err("shippingMethod")}

        <label htmlFor="startPrice">開始価格（円） <small>1〜10,000,000</small></label>
        <input id="startPrice" className="form-input" type="number" min={1} max={10_000_000} step={1} required value={form.startPriceYen} onChange={set("startPriceYen")} />
        {err("startPriceYen")}

        <label htmlFor="buyoutPrice">即決価格（円） <small>任意。開始価格より高い金額</small></label>
        <input id="buyoutPrice" className="form-input" type="number" min={1} max={10_000_000} step={1} value={form.buyoutPriceYen} onChange={set("buyoutPriceYen")} />
        {err("buyoutPriceYen")}

        <label htmlFor="duration">開催期間</label>
        <select id="duration" className="form-input" value={form.durationHours} onChange={set("durationHours")}>
          {DURATIONS.map(([hours, label]) => (
            <option key={hours} value={hours}>{label}</option>
          ))}
        </select>

        <label className="check-row">
          <input type="checkbox" checked={form.autoExtension} onChange={(e) => setForm((f) => ({ ...f, autoExtension: e.target.checked }))} />
          自動延長あり（終了5分前以降に価格が上がると5分延長）
        </label>

        {message && <p className="notice notice-error" role="alert">{message}</p>}
        <p className="notice notice-warn">画像の登録はまだできません（準備中）。公開するとすぐにオークションが始まります。</p>
        <div className="button-row">
          <button className="primary-link" type="submit" disabled={busy}>
            出品する（公開） <span>↗</span>
          </button>
          <button className="secondary-button" type="button" disabled={busy} onClick={() => void submit(false)}>
            下書きとして保存
          </button>
        </div>
      </form>
    </main>
  );
}
