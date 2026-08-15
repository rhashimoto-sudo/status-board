"use client";

import { useEffect, useState } from "react";
import { StatValue } from "@/components/ui/stat-value";
import { EXP_PENALTY, HP_PENALTY } from "@/lib/constants";
import type { DailyQuest } from "@/lib/types";

type DailyChecklistProps = {
  /** ビルド時の静的な初期値。マウント後に Notion の実状態で置き換える。 */
  initial: readonly DailyQuest[];
};

type Row = DailyQuest & { pending: boolean };

/**
 * デイリーのチェックリスト（10_notion_schema.md §5 / C-21'）。
 *
 * ## 静的生成を壊さないための構造
 * ページ本体（レーダー・90日履歴）は静的生成のまま維持し、**変わるのはこの5件だけ**を
 * マウント後にクライアントから取りに行く。重い部分をビルド時に固めたままにできる。
 * 初期表示は静的 JSON の値なので、Notion が落ちていても画面は出る。
 *
 * ## 楽観的更新
 * Notion API の往復は 300ms〜1秒かかる。毎日触るものでそれだけ待たされるのは苦痛なので、
 * **押した瞬間に見た目を変え、裏で送る。失敗したら戻す。**
 *
 * ## ここで HP・ストリークを動かさないこと
 * 押しても HP もストリークも変わらない。未達判定は日次ジョブ（03:00 JST）の責務であり、
 * `penalty.ts` が唯一の計算元という契約を守る。**チェックは「事実の記録」に過ぎない。**
 * この非対称は誤解を招くので、画面にその旨を明記する（下部の注記）。
 */
export function DailyChecklist({ initial }: DailyChecklistProps) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((daily) => ({ ...daily, pending: false })),
  );
  const [syncError, setSyncError] = useState(false);

  // マウント後に Notion の実状態へ置き換える（初期値はビルド時のスナップショット）。
  useEffect(() => {
    let cancelled = false;
    fetch("/api/daily")
      .then((response) => (response.ok ? response.json() : Promise.reject(response.status)))
      .then((body: { dailies: DailyQuest[] }) => {
        if (cancelled || body.dailies.length === 0) return;
        setRows(body.dailies.map((daily) => ({ ...daily, pending: false })));
      })
      .catch(() => {
        // 取得できなくても静的な初期値のまま表示を続ける（画面を落とさない）。
        if (!cancelled) setSyncError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(id: string, next: boolean) {
    setSyncError(false);
    // 楽観的更新: 先に見た目を変える。
    setRows((prev) =>
      prev.map((row) => (row.id === id ? { ...row, done: next, pending: true } : row)),
    );

    try {
      const response = await fetch(`/api/daily/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: next }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, pending: false } : row)));
    } catch {
      // 巻き戻す。押した内容が保存されていないことを明示する。
      setRows((prev) =>
        prev.map((row) => (row.id === id ? { ...row, done: !next, pending: false } : row)),
      );
      setSyncError(true);
    }
  }

  const remaining = rows.filter((row) => !row.done).length;

  return (
    <>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id}>
            <label className="flex min-w-0 cursor-pointer items-baseline gap-2">
              <input
                type="checkbox"
                checked={row.done}
                onChange={(event) => void toggle(row.id, event.target.checked)}
                className="mt-1 size-4 shrink-0 accent-[color:var(--color-accent-cyan)]"
              />
              <span
                className={`min-w-0 flex-1 break-words text-[color:var(--color-text-primary)] ${
                  row.pending ? "opacity-60" : ""
                }`}
              >
                {row.title}
                {row.exploration && (
                  <span className="ml-2 whitespace-nowrap rounded-[3px] border border-[color:var(--color-accent-violet)]/40 px-1.5 py-0.5 text-[11px] tracking-[0.08em] text-[color:var(--color-accent-violet)]">
                    探索枠
                  </span>
                )}
              </span>
              {/*
                生活基盤のデイリー（main が null）は軸も EXP も持たない。ここに「+0」と
                出すと「やっても意味がない」に見えるが、実際はストリーク経由で
                ⚔️EXECUTION に効いている。数値ではなく「土台」と表示してそれを示す
                （ステータス一覧の区切りでも同じ語を使っている）。
              */}
              <span className="whitespace-nowrap text-[13px] text-[color:var(--color-text-secondary)]">
                {row.main === null ? (
                  <span className="text-[color:var(--color-text-muted)]">土台 → ⚔️</span>
                ) : (
                  <>
                    {row.main} +<StatValue>{row.expectedExp}</StatValue>
                  </>
                )}
              </span>
            </label>
          </li>
        ))}
      </ul>

      {syncError && (
        <p className="mt-3 text-[13px] text-[color:var(--color-hp-danger)]">
          同期できませんでした。表示は保存されていない可能性があります
        </p>
      )}

      {/*
        残数と未達の代償。チェックに連動して変わるため、サーバー側ではなくここに置く。
        HP・ストリークが「押した瞬間には動かない」ことも明記する。押しても数字が変わらないと
        「反映されていない」と誤解されるため（10_notion_schema.md §5）。
      */}
      <div className="mt-4 border-t border-[color:var(--color-border-hairline)] pt-3 text-[13px] text-[color:var(--color-text-secondary)]">
        {rows.length === 0 ? (
          <p>本日のデイリーはありません</p>
        ) : remaining === 0 ? (
          <p>✓ 本日達成済み</p>
        ) : (
          <>
            <p>
              ⚠ あと <StatValue>{remaining}</StatValue> つでストリークが途切れます
            </p>
            <p>
              未達なら HP <StatValue>{HP_PENALTY.dailyMiss}</StatValue> / ⚔️EXECUTION{" "}
              <StatValue>{EXP_PENALTY.dailyMissExecution}</StatValue> / 🔥 → <StatValue>0</StatValue>
            </p>
          </>
        )}
        <p className="mt-2 text-[color:var(--color-text-muted)]">
          チェックは記録のみ。HP・ストリークの反映は毎日 3:00 に走ります
        </p>
      </div>
    </>
  );
}
