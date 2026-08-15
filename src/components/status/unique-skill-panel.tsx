import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatValue } from "@/components/ui/stat-value";
import { DERIVATION_EXP_BONUS } from "@/lib/constants";
import { skillProgress } from "@/lib/skill";
import type { UniqueSkill } from "@/lib/types";

type UniqueSkillPanelProps = {
  skill: UniqueSkill;
};

const DERIVATION_BONUS_LABEL = `+${DERIVATION_EXP_BONUS * 100}%`;

/**
 * 固有スキル《構造化》パネル（07_unique_skill.md §5.2）。
 * Lv・発動回数・次Lvまでの残回数・倍率・派生5件（解放・未解放とその条件）を表示する。
 */
export function UniqueSkillPanel({ skill }: UniqueSkillPanelProps) {
  const progress = skillProgress(skill.activations);
  const unlockedCount = skill.derivations.filter((derivation) => derivation.unlocked).length;

  return (
    <Panel heading={<span>🧬 固有スキル</span>}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="text-[16px] font-semibold text-[color:var(--color-text-primary)]">
          《構造化》{" "}
          <span className="text-[13px] font-normal text-[color:var(--color-text-secondary)]">Rank S</span>
        </div>
        <div className="flex items-baseline gap-3 text-[13px] text-[color:var(--color-text-secondary)]">
          <span>
            Lv <StatValue className="text-[16px] font-semibold text-[color:var(--color-text-primary)]">{skill.level}</StatValue>
          </span>
          <StatValue className="text-[16px] font-semibold text-[color:var(--color-accent-cyan)]">
            ×{skill.multiplier.toFixed(2)}
          </StatValue>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-[13px] text-[color:var(--color-text-secondary)]">
          <span>
            発動回数 <StatValue>{skill.activations}</StatValue> 回
          </span>
          <span>
            {skill.toNext === null ? (
              <StatValue>MAX</StatValue>
            ) : (
              <>
                次Lvまで <StatValue>{skill.toNext}</StatValue>
              </>
            )}
          </span>
        </div>
        <div className="mt-1">
          <ProgressBar value={progress} max={1} colorToken="cyan" label="固有スキル《構造化》の進捗" />
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[13px] font-semibold text-[color:var(--color-text-secondary)]">派生</div>
        <ul className="mt-2 space-y-2">
          {skill.derivations.map((derivation) => (
            <li
              key={derivation.id}
              className={`flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[14px] ${
                derivation.unlocked
                  ? "text-[color:var(--color-text-primary)]"
                  : "text-[color:var(--color-text-muted)]"
              }`}
            >
              <span aria-hidden="true">{derivation.unlocked ? "✓" : "・"}</span>
              <span>{derivation.name}</span>
              <span className="text-[13px]">
                {derivation.requirements.map((requirement, index) => (
                  <span key={requirement.key}>
                    {index > 0 ? " + " : ""}
                    {requirement.key} Lv
                    <StatValue>{requirement.required}</StatValue>
                  </span>
                ))}
              </span>
              {derivation.unlocked ? (
                <span className="text-[13px] text-[color:var(--color-accent-cyan)]">{DERIVATION_BONUS_LABEL}</span>
              ) : (
                <span className="text-[13px]">
                  (現{" "}
                  {derivation.requirements
                    .map(
                      (requirement) =>
                        `${requirement.key} Lv${requirement.current}`,
                    )
                    .join(" / ")}
                  )
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-4 border-t border-[color:var(--color-border-hairline)] pt-3 text-[13px] text-[color:var(--color-text-secondary)]">
        最終クラス《AIビジネスアーキテクト》{" "}
        <StatValue>{unlockedCount}</StatValue>/<StatValue>{skill.derivations.length}</StatValue>
      </div>
    </Panel>
  );
}
