// 表示用の書式。金額は整数の円、日時は UTC で受け取って JST で表示する（AGENTS.md）。

const yen = new Intl.NumberFormat("ja-JP");
const jst = new Intl.DateTimeFormat("ja-JP", {
  timeZone: "Asia/Tokyo",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatYen(value: number): string {
  return `¥${yen.format(value)}`;
}

export function formatJst(value: string | null | undefined): string {
  return value ? `${jst.format(new Date(value))}（日本時間）` : "—";
}

/** 残り時間（例: 「あと 2日 3時間」）。正式な終了判定はサーバーが行う（仕様書 6.2）。 */
export function remainingLabel(endsAt: string | null | undefined, now = Date.now()): string {
  if (!endsAt) return "公開後に決まります";
  const ms = Date.parse(endsAt) - now;
  if (ms <= 0) return "終了時刻を過ぎました";
  const minutes = Math.ceil(ms / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const mins = minutes % 60;
  if (days > 0) return `あと ${days}日 ${hours}時間`;
  if (hours > 0) return `あと ${hours}時間 ${mins}分`;
  return `あと ${mins}分`;
}

export const STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  published: "公開中",
  ended: "終了",
  suspended: "停止中",
  cancelled: "取り下げ済み",
};

export const END_REASON_LABELS: Record<string, string> = {
  expired: "終了時刻に終了",
  buyout: "即決で落札",
  early_end: "出品者が早期終了",
  cancelled: "キャンセル",
};
