"use client";

import { useEffect, useState } from "react";
import { URGENT_GLOW_WITHIN_DAYS } from "@/lib/constants";
import { StatValue } from "@/components/ui/stat-value";

type CountdownProps = { deadline: string };

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const MS_PER_DAY =
  HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatRemaining(remainingMs: number): string {
  const totalSeconds = Math.floor(remainingMs / MS_PER_SECOND);
  const days = Math.floor(totalSeconds / (HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE));
  const hours = Math.floor(
    (totalSeconds % (HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE)) /
      (MINUTES_PER_HOUR * SECONDS_PER_MINUTE)
  );
  const minutes = Math.floor((totalSeconds % (MINUTES_PER_HOUR * SECONDS_PER_MINUTE)) / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${pad(days)}日 ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/**
 * 秒まで動くカウントダウン（09_dashboard_spec.md §3.1 / C-3 / C-4）。
 * `setInterval` / `clearInterval` を持つのはこのファイルのみ。
 * 毎秒 `Date.now()` と deadline の差分を再計算する（自前で1秒ずつ減算しない）。
 */
export function Countdown({ deadline }: CountdownProps) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // マウント前（サーバー描画・ハイドレーション直後）は未確定のプレースホルダーを出す。
  if (now === null) {
    return (
      <div className="inline-flex items-center gap-2">
        <span aria-hidden="true">⏳</span>
        <StatValue>--日 --:--:--</StatValue>
      </div>
    );
  }

  const remainingMs = new Date(deadline).getTime() - now;

  // 解釈不能な deadline（`Number.isNaN`）は `NaN日 NaN:NaN:NaN` を出さず、
  // マウント前と同じプレースホルダーにフォールバックする（発光もしない）。
  if (Number.isNaN(remainingMs)) {
    return (
      <div className="inline-flex items-center gap-2">
        <span aria-hidden="true">⏳</span>
        <StatValue>--日 --:--:--</StatValue>
      </div>
    );
  }

  const isExpired = remainingMs <= 0;
  const isUrgent = !isExpired && remainingMs < URGENT_GLOW_WITHIN_DAYS * MS_PER_DAY;

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-[4px] ${
        isUrgent ? "danger-glow px-2 py-1" : ""
      }`}
    >
      <span aria-hidden="true">{isExpired ? "💀" : isUrgent ? "⚠" : "⏳"}</span>
      <StatValue
        className={
          isExpired || isUrgent ? "text-[color:var(--color-hp-danger)]" : undefined
        }
      >
        {isExpired ? "期限切れ" : formatRemaining(remainingMs)}
      </StatValue>
    </div>
  );
}
