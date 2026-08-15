import { Panel } from "@/components/ui/panel";
import { StatValue } from "@/components/ui/stat-value";
import type { DefeatEntry, StatusKey } from "@/lib/types";

type DefeatLogProps = {
  defeats: readonly DefeatEntry[];
};

// 絵文字はテキストラベルと併記する（NFR-4）。色だけで種別・重さを伝えない。
// Record で全 kind を網羅する（新しい kind が増えたらここが型エラーになる）。
const KIND_META: Readonly<Record<DefeatEntry["kind"], { icon: string; label: string }>> = {
  boss: { icon: "🐉", label: "討伐失敗" },
  guerrilla: { icon: "⏰", label: "期限切れ" },
  mission: { icon: "📜", label: "ミッション失敗" },
};

// status-list.tsx と同じ意匠（03_status_system.md §1）。key はテキストで併記するため aria-hidden にする。
const STATUS_ICONS: Readonly<Record<StatusKey, string>> = {
  INT: "🧠",
  TECH: "💻",
  DATA: "📊",
  MARKETING: "📣",
  PM: "👑",
  BRIDGE: "🤝",
  ENGLISH: "🌎",
  LEARNING: "🔥",
  EXECUTION: "⚔️",
};

/**
 * 敗北ログ（09_dashboard_spec.md §3.4）。
 * 討伐失敗・期限切れ・失敗ミッションの「墓標」一覧。被ダメージ（HP/EXP）とリベンジ対象を表示する。
 */
export function DefeatLog({ defeats }: DefeatLogProps) {
  return (
    <Panel heading={<span>💀 敗北ログ</span>}>
      {defeats.length === 0 ? (
        <p className="text-[14px] text-[color:var(--color-text-secondary)]">記録なし</p>
      ) : (
        <ul className="space-y-4">
          {defeats.map((defeat) => (
            <DefeatRow key={`${defeat.kind}-${defeat.name}-${defeat.date}`} defeat={defeat} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function DefeatRow({ defeat }: { defeat: DefeatEntry }) {
  const meta = KIND_META[defeat.kind];

  return (
    <li className="border-l-2 border-[color:var(--color-border-hairline)] pl-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span aria-hidden="true">{meta.icon}</span>
        <span className="text-[13px] text-[color:var(--color-text-secondary)]">{meta.label}</span>
        <span className="font-semibold text-[color:var(--color-text-primary)]">{defeat.name}</span>
        <span className="text-[13px] text-[color:var(--color-text-secondary)]">{defeat.date}</span>
      </div>

      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
        <span className="text-[color:var(--color-text-secondary)]">
          ♥HP <StatValue className="text-[color:var(--color-hp-danger)]">-{defeat.hpDamage}</StatValue>
        </span>
        {defeat.expDamage.map((exp) => (
          <span key={exp.key} className="text-[color:var(--color-text-secondary)]">
            <span aria-hidden="true">{STATUS_ICONS[exp.key]}</span> {exp.key}{" "}
            <StatValue className="text-[color:var(--color-hp-danger)]">{exp.amount}</StatValue>
          </span>
        ))}
      </div>

      {defeat.revengeable && (
        <div className="mt-1 flex items-center gap-1 text-[13px] text-[color:var(--color-accent-violet)]">
          <span aria-hidden="true">🗡</span>
          <span>リベンジ対象</span>
        </div>
      )}
    </li>
  );
}
