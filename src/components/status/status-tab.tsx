import { CalibrationBanner } from "@/components/calibration-banner";
import { BalanceMeter } from "@/components/status/balance-meter";
import { HeroHeader } from "@/components/status/hero-header";
import { SkillEmblem } from "@/components/status/skill-emblem";
import { StatusList } from "@/components/status/status-list";
import { StatusRadar, type StatusRadarPoint } from "@/components/status/status-radar";
import { UniqueSkillPanel } from "@/components/status/unique-skill-panel";
import { STATUS_ORDER } from "@/lib/constants";
import { computeTotalLevel, levelFromExp, levelsOf, weakestStatuses } from "@/lib/level";
import { hpState } from "@/lib/penalty";
import { buildUniqueSkill } from "@/lib/skill";
import { totalTitleFor } from "@/lib/titles";
import type { DashboardData, StatusKey } from "@/lib/types";

// 一覧・ヒーローで共通の意匠（03_status_system.md §1）。
const STATUS_ICONS: Readonly<Record<StatusKey, string>> = {
  INT: "🧠", TECH: "💻", DATA: "📊", MARKETING: "📣", PM: "👑",
  BRIDGE: "🤝", ENGLISH: "🌎", LEARNING: "🔥", EXECUTION: "⚔️",
};

type StatusTabProps = { data: DashboardData };

/**
 * Tab1「ステータス」（09_dashboard_spec.md §2）。サーバーコンポーネント。
 * calibration 中は CalibrationBanner をこのタブ内部の先頭に置く（共通ヘッダーには置かない。C-13）。
 */
export function StatusTab({ data }: StatusTabProps) {
  const { state } = data;
  const calibrating = state.phase === "calibration";

  const levels = levelsOf(state.statuses);
  const measuredKeys = STATUS_ORDER.filter((key) => state.statuses[key].measured);
  const allMeasured = measuredKeys.length === STATUS_ORDER.length;

  // 全軸の測定が完了するまで TOTAL Lv・総合称号は未測定（null）。docs/03_status_system.md:189。
  const totalLevel = allMeasured ? computeTotalLevel(state.statuses) : null;
  const totalTitle = totalLevel === null ? null : totalTitleFor(totalLevel);

  const radarData: readonly StatusRadarPoint[] = STATUS_ORDER.map((key) => ({
    key,
    current: levels[key],
    ghost: levelFromExp(state.statuses[key].expThreeMonthsAgo),
  }));

  const skill = buildUniqueSkill(state.uniqueSkillActivations, state.statuses);
  const weak = weakestStatuses(state.statuses);
  const weakKeys = weak.map((w) => w.key);
  const weakAxes = weak.map((w) => ({ key: w.key, level: w.level, icon: STATUS_ICONS[w.key] }));
  const balanceMeasured =
    state.statuses.LEARNING.measured && state.statuses.EXECUTION.measured;

  return (
    <div className="flex flex-col gap-4">
      {calibrating && state.calibration ? (
        <CalibrationBanner progress={state.calibration} />
      ) : null}

      <HeroHeader
        totalLevel={totalLevel}
        totalTitle={totalTitle}
        hpState={hpState(state.hp, state.phase)}
        debuffs={state.debuffs}
        streak={state.streak}
        phase={state.phase}
        weakAxes={weakAxes}
      />

      <StatusRadar
        data={radarData}
        measuredKeys={calibrating ? (measuredKeys as readonly StatusKey[]) : undefined}
        centerSlot={<SkillEmblem skillLevel={calibrating ? null : skill.level} />}
      />

      <StatusList items={state.statuses} weakKeys={weakKeys} />

      {/*
        歪みメーターは LEARNING / EXECUTION が両方とも測定済みのときだけ出す。
        未測定の軸は StatusList・レーダーとも "???" 表示になるため、ここだけ Lv1 扱いで
        「バランスが取れています」と診断すると同一画面内で矛盾した情報になる（03_status_system.md の
        未測定の扱いに従う）。測定が済み次第そのまま表示される。
      */}
      {balanceMeasured ? (
        <BalanceMeter
          learningLv={levels.LEARNING}
          executionLv={levels.EXECUTION}
          gapThreeMonthsAgo={
            levelFromExp(state.statuses.LEARNING.expThreeMonthsAgo) -
            levelFromExp(state.statuses.EXECUTION.expThreeMonthsAgo)
          }
        />
      ) : null}

      {/*
        固有スキルパネルは一覧・歪みメーターの後ろに置く。
        派生の解放条件は「TECH Lv7 + INT Lv5」のようにステータスの閾値で書かれており、
        一覧（TECH は Lv4）を読まないと評価できない。条件を先に見せると4件分の条件を
        覚えたままスクロールさせることになるため、全体 → 内訳 → 解釈 → 次の一手 の順にする。
        （07_unique_skill.md の「紋章の直下にパネル」という記述は docs 側で追随が必要）
      */}
      <UniqueSkillPanel skill={skill} totalLevel={totalLevel} />
    </div>
  );
}
