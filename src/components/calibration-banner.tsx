import type { CalibrationProgress } from "@/lib/types";

type CalibrationBannerProps = {
  progress: CalibrationProgress;
};

/**
 * 測定期間中の進行バナー。各タブの内部に置く部品（共通ヘッダーではない）。
 * サーバーコンポーネント（"use client" を付けない）。
 */
export function CalibrationBanner({ progress }: CalibrationBannerProps) {
  const { day, totalDays, done, totalQuests } = progress;

  return (
    <div className="rounded border border-[color:var(--color-border-hairline)] bg-[color:var(--color-surface-raised)] px-4 py-2 text-[color:var(--color-text-primary)]">
      <span className="font-mono tabular-nums">
        CALIBRATION PHASE Day {day}/{totalDays}
      </span>
      <span className="ml-3 font-mono tabular-nums">
        {totalQuests}件中 {done}件完了
      </span>
    </div>
  );
}
