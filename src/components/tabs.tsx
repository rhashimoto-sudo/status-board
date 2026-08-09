"use client";

import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";

type TabId = "status" | "mission" | "growth";

type TabDef = {
  id: TabId;
  label: string;
};

const TAB_DEFS: readonly TabDef[] = [
  { id: "status", label: "ステータス" },
  { id: "mission", label: "ミッション" },
  { id: "growth", label: "成長推移" },
];

type TabsProps = {
  statusTab: ReactNode;
  missionTab: ReactNode;
  growthTab: ReactNode;
};

const PANEL_BY_ID: Record<TabId, keyof TabsProps> = {
  status: "statusTab",
  mission: "missionTab",
  growth: "growthTab",
};

/**
 * 3タブのシェル。データを一切知らず、選択中の1つの slot だけを DOM に残す
 * （非選択タブはアンマウントし、裏で setInterval を回さない）。
 */
export function Tabs({ statusTab, missionTab, growthTab }: TabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("status");
  const tabRefs = useRef<Record<TabId, HTMLButtonElement | null>>({
    status: null,
    mission: null,
    growth: null,
  });

  const panels: Record<keyof TabsProps, ReactNode> = {
    statusTab,
    missionTab,
    growthTab,
  };

  function moveFocus(nextIndex: number) {
    const wrapped = (nextIndex + TAB_DEFS.length) % TAB_DEFS.length;
    const next = TAB_DEFS[wrapped];
    setActiveTab(next.id);
    tabRefs.current[next.id]?.focus();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = TAB_DEFS.findIndex((tab) => tab.id === activeTab);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveFocus(currentIndex + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveFocus(currentIndex - 1);
    }
  }

  return (
    <div>
      <div role="tablist" aria-label="ダッシュボードタブ" className="flex gap-2">
        {TAB_DEFS.map((tab) => {
          const selected = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              ref={(el) => {
                tabRefs.current[tab.id] = el;
              }}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`tabpanel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={handleKeyDown}
              className="focus-ring flex min-h-11 min-w-11 items-center justify-center px-4 text-[color:var(--color-text-primary)] data-[selected=true]:text-[color:var(--color-accent-cyan)]"
              data-selected={selected}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        tabIndex={0}
        className="focus-ring mt-4"
      >
        {panels[PANEL_BY_ID[activeTab]]}
      </div>
    </div>
  );
}
