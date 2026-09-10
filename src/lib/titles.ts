import type { StatusKey } from "./types";
import { TITLE_BAND_SIZE } from "./constants";

// ── 称号テーブル（01_requirements.md FR-1-2 / 03_status_system.md §2 が正典）
// ★ ユーザー提示の正典。表記・順序を一字一句変更してはならない。
// ★ 以下の重複は意図的であり、リネームによる重複解消を禁止する:
//   「学習者」= INT Lv1 = LEARNING Lv1
//   「探索者」= INT Lv2 = LEARNING Lv2 = 総合 Lv2
//   「推進者」= PM Lv3 = EXECUTION Lv6
export const TITLES: Readonly<Record<StatusKey, readonly string[]>> = {
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
} as const;

// ── 総合称号（TOTAL）Lv1〜10
export const TOTAL_TITLES: readonly string[] = [
  "初心者", "探索者", "実践者", "専門職", "複合スキルワーカー",
  "クロスファンクショナル人材", "テクノロジスト", "ビジネスアーキテクト", "AIビジネスアーキテクト", "トランスフォーメーションリーダー",
];

// 03_status_system.md §3.2「総合称号 = TOTAL_TITLES[floor(TOTAL Lv) - 1]」/
// 09_dashboard_spec.md:59「totalTitleFor(floor(totalLv))」が正典。
// 称号テーブルは10段のまま、Lvを TITLE_BAND_SIZE(=10) 刻みの「帯」に丸めてインデックス化する。
// Lv1〜10=第1帯、Lv11〜20=第2帯、…、Lv91〜100=第10帯 という対応で、10Lvごとに1段昇格する。
//
// 帯判定の前に必ず floor する（Issue #40）。呼び出し元（例: status-tab.tsx の
// totalTitleFor(totalLevel)）は computeTotalLevel が返す小数第1位の TOTAL Lv を
// floor せずにそのまま渡してくる。floor を後段（この関数の中）で行わないと、
// 例えば Lv=20.4 は Math.ceil(20.4/10)=3 となり本来の第2帯（floor(20.4)=20 →
// ceil(20/10)=2）より1帯早く昇格してしまう。呼び出し元全部に floor を強制するより、
// 帯判定の関数自身が契約通りに丸める方が、同じ間違いの再発を防げる。
function clampLevel(level: number): number {
  return Math.min(10, Math.max(1, Math.ceil(Math.floor(level) / TITLE_BAND_SIZE)));
}

export function titleFor(key: StatusKey, level: number): string {
  return TITLES[key][clampLevel(level) - 1];
}

export function totalTitleFor(totalLevel: number): string {
  return TOTAL_TITLES[clampLevel(totalLevel) - 1];
}
