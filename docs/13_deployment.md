# 13. デプロイ・本番環境

> 実際に触れる場所と、そこに至るための情報。**URL を探し直さないための記録。**

---

## 1. 本番 URL

```
https://status-board-khaki.vercel.app/
```

**Basic 認証が掛かっている**（`BASIC_AUTH_USER` / `BASIC_AUTH_PASSWORD`）。
初回アクセス時にブラウザがダイアログを出す。

### 1.1 なぜ `status-board.vercel.app` ではないのか

`status-board.vercel.app` と `statusboard.vercel.app` は**どちらも別のユーザーが使用済み**
（前者は "assetbird Status"、後者は "Create Next App"）。Vercel が代わりに
`status-board-khaki` を割り当てた。**`-khaki` は Vercel が付けたランダムな接尾辞**であり、
意味は無い。

> **探し直すときの注意**: デプロイごとの URL（`status-board-<hash>-rikuhashis-projects.vercel.app`）は
> **Vercel の Deployment Protection（SSO）** で保護されており、外部からアクセスできない。
> GitHub の deployments API（`gh api repos/<owner>/<repo>/deployments`）に記録されるのも
> このデプロイ固有 URL だけで、**本番の固定 URL は記録されない**。
> 見失った場合は Vercel ダッシュボードのプロジェクト一覧を見るのが確実。

---

## 2. Vercel の設定

| 項目 | 値 |
|---|---|
| プラン | Hobby（無料枠） |
| 連携 | GitHub（`rhashimoto-sudo/status-board`）。`main` への push で自動デプロイ |
| Deployment Protection | **有効**（デプロイ固有 URL は Vercel SSO 必須） |

### 2.1 環境変数（Vercel 側）

| 変数 | 入れる | 備考 |
|---|---|---|
| `NOTION_API_KEY` | ✅ | **Quests DB だけに接続した Integration** のトークンにすること |
| `NOTION_QUESTS_DB_ID` | ✅ | |
| `BASIC_AUTH_USER` | ✅ | |
| `BASIC_AUTH_PASSWORD` | ✅ | |
| `NOTION_TASKS_DB_ID` | ❌ **入れない** | work-dashboard タスクDB の読み取りは日次ジョブ側の責務 |

> **ルール**: Vercel 側のトークンの到達範囲を Quests DB に限定する。
> 万一漏れても**業務データ（work-dashboard タスクDB）には構造的に届かない**状態を保つ。
> ローカル・GitHub Actions 用のトークンとは分けること（`10_notion_schema.md` §5）。

> **注意**: 環境変数が未設定だと middleware が **503** を返し、**全ページが見えなくなる**。
> 「未設定なら認証を素通しする」フォールバックは意図的に実装していない
> （無防備なまま公開される方が危険なため）。デプロイ前に必ず設定しておくこと。

---

## 3. 動作確認の手順

`.env.local` の値を使って外から叩ける。

```bash
U="https://status-board-khaki.vercel.app"
US=$(grep '^BASIC_AUTH_USER=' .env.local | cut -d= -f2)
PS=$(grep '^BASIC_AUTH_PASSWORD=' .env.local | cut -d= -f2)

curl -s -o /dev/null -w '%{http_code}\n' "$U/"              # 401 が正
curl -s -o /dev/null -w '%{http_code}\n' -u "$US:$PS" "$U/" # 200 が正
```

### 3.1 2026-08-15 の確認結果（本番）

| 項目 | 結果 |
|---|---|
| 認証なし | **401** + `WWW-Authenticate: Basic realm="status-board"` |
| 認証あり | **200** |
| ステータスタブ | TOTAL Lv / HP / ストリーク / レーダー / 背景アニメーション すべて描画 |
| ミッションタブ | **Notion の実データ**でデイリー5個を表示 |
| デイリーのチェック | 画面で押下 → **Notion の `Status` が `todo` → `done` に変化**（一気通貫を確認） |
| 生活基盤の3件 | `土台 → ⚔️` で表示（軸なし・EXP なし） |

---

## 4. 既知の制約

| 項目 | 内容 |
|---|---|
| **日次ジョブが未実装** | チェックは Notion に溜まるが、**HP・ストリーク・EXP は動かない**（ダミー値のまま）。03:00 JST の GitHub Actions が未着手（`10_notion_schema.md` §4.1） |
| 全ページに認証 | 第三者に見せる場合は別の設計が必要。`fetch()` は 401 で認証ダイアログを出さないため、API だけを守る構成では動かない（`src/middleware.ts` に詳細） |
| 自動テストからの到達 | Deployment Protection のため、CI から本番を直接叩くには Protection Bypass トークンが要る（未設定） |
