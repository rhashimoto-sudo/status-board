import { describe, expect, it } from "vitest";
import { TITLES, TOTAL_TITLES, titleFor, totalTitleFor } from "@/lib/titles";
import { STATUS_ORDER } from "@/lib/constants";

// ── 01_requirements.md FR-1-2 / 03_status_system.md §2 の正典（一字一句コピー）
const CANONICAL_TITLES: Record<string, readonly string[]> = {
  INT: [
    "学習者", "探索者", "思考者", "分析者", "論理家",
    "問題解決者", "戦略家", "構造設計者", "思考指揮者", "賢者",
  ],
  TECH: [
    "PC使い", "コード探索者", "コーダー", "AIコーダー", "AI開発者",
    "システム開発者", "ソフトウェア設計者", "システムアーキテクト", "AIエンジニア", "AIマスター",
  ],
  DATA: [
    "データ入門者", "データ探索者", "データアナリスト", "SQLアナリスト", "データサイエンティスト",
    "統計分析者", "モデリング設計者", "データ戦略家", "データサイエンスリーダー", "データマスター",
  ],
  MARKETING: [
    "マーケ入門者", "マーケター", "SEOマーケター", "グロースマーケター", "データマーケター",
    "マーケ戦略家", "グロース設計者", "事業マーケター", "マーケティングアーキテクト", "マーケティングマスター",
  ],
  PM: [
    "参加者", "タスク実行者", "推進者", "プロジェクトリーダー", "PM",
    "プロジェクト設計者", "プロジェクト統括者", "プログラムマネージャー", "事業推進者", "プロジェクトマスター",
  ],
  BRIDGE: [
    "聞き手", "翻訳者", "調整役", "ファシリテーター", "ブリッジャー",
    "ソリューション設計者", "組織横断者", "ビジネスアーキテクト", "トランスフォーマー", "ビジネス・テクノロジー・マスター",
  ],
  ENGLISH: [
    "英語学習者", "英語読解者", "英語情報収集者", "英語コミュニケーター", "英語実務者",
    "バイリンガルワーカー", "グローバルリサーチャー", "グローバルコミュニケーター", "グローバルブリッジャー", "バイリンガルマスター",
  ],
  LEARNING: [
    "学習者", "探索者", "習得者", "自走学習者", "応用者",
    "統合者", "高速習得者", "学習設計者", "知識創造者", "学習の達人",
  ],
  EXECUTION: [
    "着手者", "行動者", "実行者", "遂行者", "習慣化者",
    "推進者", "完遂者", "実行設計者", "結果創出者", "実行の達人",
  ],
};

const CANONICAL_TOTAL_TITLES: readonly string[] = [
  "初心者", "探索者", "実践者", "専門職", "複合スキルワーカー",
  "クロスファンクショナル人材", "テクノロジスト", "ビジネスアーキテクト", "AIビジネスアーキテクト", "トランスフォーメーションリーダー",
];

describe("titles.ts", () => {
  it("9キー分すべてが存在し、STATUS_ORDER と一致する", () => {
    expect(Object.keys(TITLES).sort()).toEqual([...STATUS_ORDER].sort());
  });

  it("TITLES は9キー x 10件 = 90件で正典と一字一句一致する", () => {
    let total = 0;
    for (const key of STATUS_ORDER) {
      expect(TITLES[key]).toHaveLength(10);
      expect(TITLES[key]).toEqual(CANONICAL_TITLES[key]);
      total += TITLES[key].length;
    }
    expect(total).toBe(90);
  });

  it("TOTAL_TITLES は10件で正典と一字一句一致する", () => {
    expect(TOTAL_TITLES).toHaveLength(10);
    expect(TOTAL_TITLES).toEqual(CANONICAL_TOTAL_TITLES);
  });

  it("titleFor が例示どおりの称号を返す", () => {
    expect(titleFor("INT", 5)).toBe("論理家");
    expect(titleFor("TECH", 10)).toBe("AIマスター");
    expect(titleFor("BRIDGE", 1)).toBe("聞き手");
  });

  it("totalTitleFor が例示どおりの称号を返す", () => {
    expect(totalTitleFor(9)).toBe("AIビジネスアーキテクト");
    expect(totalTitleFor(10)).toBe("トランスフォーメーションリーダー");
  });

  it("titleFor は Lv0・Lv11 を例外を投げず 1..10 にクランプする", () => {
    expect(() => titleFor("INT", 0)).not.toThrow();
    expect(() => titleFor("INT", 11)).not.toThrow();
    expect(titleFor("INT", 0)).toBe(titleFor("INT", 1));
    expect(titleFor("INT", 11)).toBe(titleFor("INT", 10));
  });

  it("totalTitleFor は Lv0・Lv11 を例外を投げず 1..10 にクランプする", () => {
    expect(() => totalTitleFor(0)).not.toThrow();
    expect(() => totalTitleFor(11)).not.toThrow();
    expect(totalTitleFor(0)).toBe(totalTitleFor(1));
    expect(totalTitleFor(11)).toBe(totalTitleFor(10));
  });

  it("非整数 Lv を floor して称号を返す（03_status_system.md §3.2 / 09_dashboard_spec.md:59）", () => {
    // totalTitleFor(3.9) は floor(3.9) = 3 → Lv3 の称号（undefined にならない）
    expect(totalTitleFor(3.9)).toBe(totalTitleFor(3));
    expect(totalTitleFor(3.9)).toBeDefined();
    expect(totalTitleFor(3.9)).not.toBe("undefined");

    // titleFor("INT", 4.7) は floor(4.7) = 4 → Lv4 の称号
    expect(titleFor("INT", 4.7)).toBe(titleFor("INT", 4));
    expect(titleFor("INT", 4.7)).toBeDefined();
  });

  it("非整数 Lv の境界値（下限・上限）でも undefined にならない", () => {
    expect(totalTitleFor(1.0)).toBe(totalTitleFor(1));
    expect(totalTitleFor(0.5)).toBe(totalTitleFor(1));
    expect(totalTitleFor(10.0)).toBe(totalTitleFor(10));
    expect(totalTitleFor(10.9)).toBe(totalTitleFor(10));

    expect(titleFor("INT", 1.0)).toBe(titleFor("INT", 1));
    expect(titleFor("INT", 0.5)).toBe(titleFor("INT", 1));
    expect(titleFor("INT", 10.0)).toBe(titleFor("INT", 10));
    expect(titleFor("INT", 10.9)).toBe(titleFor("INT", 10));
  });

  it("重複称号がリネームされずそのまま残っている（意図的な重複）", () => {
    // 「学習者」= INT Lv1 = LEARNING Lv1
    expect(titleFor("INT", 1)).toBe("学習者");
    expect(titleFor("LEARNING", 1)).toBe("学習者");
    expect(titleFor("INT", 1)).toBe(titleFor("LEARNING", 1));

    // 「探索者」= INT Lv2 = LEARNING Lv2 = 総合 Lv2
    expect(titleFor("INT", 2)).toBe("探索者");
    expect(titleFor("LEARNING", 2)).toBe("探索者");
    expect(totalTitleFor(2)).toBe("探索者");

    // 「推進者」= PM Lv3 = EXECUTION Lv6
    expect(titleFor("PM", 3)).toBe("推進者");
    expect(titleFor("EXECUTION", 6)).toBe("推進者");
    expect(titleFor("PM", 3)).toBe(titleFor("EXECUTION", 6));
  });
});
