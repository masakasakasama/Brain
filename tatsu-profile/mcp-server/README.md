# tatsu-profile-mcp

Tatsu Profile（Notion）をライブ参照する **リモート MCP サーバー**。
Cloudflare Workers にデプロイし、Claude と ChatGPT の両方からカスタムコネクタとして接続する。

## ツール

| tool | 用途 | クライアント |
|---|---|---|
| `search` | プロフィールから関連セクションを検索 | ChatGPT / Claude |
| `fetch` | セクション本文を全文取得 | ChatGPT / Claude |
| `get_tatsu_profile` | 12セクション一括 or 単一取得 | 主に Claude |

`search` + `fetch` は ChatGPT カスタムコネクタが要求する標準ツール構成。
`get_tatsu_profile` は Claude で一括コンテキスト投入する用の利便ツール。

> 正直な限界: MCP でもモデルがツールを「呼ぶか」は判断次第で、毎回強制ではない。
> ただし専用ツールがあることで Notion 検索より摩擦が低く、参照率は上がる。

---

## 事前準備: Notion Internal Integration トークン

このサーバーは Notion API を直接叩く。Anthropic の Notion コネクタとは別に、
**Internal Integration トークン**が必要。

```
□ https://www.notion.so/profile/integrations を開く
□ "New integration" → Internal
  - Name: Tatsu Profile MCP
  - Capabilities: Read content（Update/Insert は不要）
  - Save
□ "Internal Integration Secret" をコピー（後で wrangler secret に入れる）
□ Notion で「🧠 Tatsu Profile」ページを開く
  → 右上「...」→ Connections → "Tatsu Profile MCP" を Connect
  （親ページに付ければ12サブページにも継承される）
```

PARENT_PAGE_ID は `wrangler.toml` に設定済み
（`36329082-7880-811d-91b6-ca4d9b057b1d` = 🧠 Tatsu Profile）。

---

## デプロイ（Cloudflare Workers）

```bash
cd tatsu-profile/mcp-server
npm install
npx wrangler login                 # ブラウザで Cloudflare 認証

# シークレット投入
npx wrangler secret put NOTION_TOKEN   # 上で取得した Internal Secret
npx wrangler secret put AUTH_SECRET    # 自分で決める長いランダム文字列（URLに入る）

npm run deploy
```

デプロイ後の URL は `https://tatsu-profile-mcp.<account>.workers.dev`。
**コネクタ URL は次の形**（`AUTH_SECRET` を第1パスに入れる）:

```
https://tatsu-profile-mcp.<account>.workers.dev/<AUTH_SECRET>/mcp
```

ヘルスチェック: `https://.../` → `tatsu-profile-mcp ok` が返ればデプロイ成功。

---

## クライアント接続

### Claude（claude.ai / デスクトップ / モバイル）

1. 設定 → Connectors → "Add custom connector"
2. URL に上記の `.../<AUTH_SECRET>/mcp` を貼る
3. 接続後、`search` / `fetch` / `get_tatsu_profile` が出れば成功

### ChatGPT

1. 設定 → Connectors（または Developer mode）→ カスタムコネクタを追加
2. 同じ `.../<AUTH_SECRET>/mcp` URL を登録（認証は "No authentication"。
   秘密は URL のパスに含まれている）
3. `search` / `fetch` が認識されれば成功
   （ChatGPT のカスタムコネクタはプラン/モードにより可否が変わる）

---

## セキュリティ

- 認証は `AUTH_SECRET` を URL パスに含める方式（bearer-in-URL）。
  個人用1コネクタなら実用上十分。より強くするなら Cloudflare Access を前段に。
- `NOTION_TOKEN` / `AUTH_SECRET` は `wrangler secret`（コード/Git に出さない）。
- `.dev.vars` は `.gitignore` 済み。

## ローカル確認

```bash
cp .dev.vars.example .dev.vars   # NOTION_TOKEN, AUTH_SECRET 記入
npm run dev
# http://localhost:8787/<AUTH_SECRET>/mcp に MCP Inspector 等で接続
```

## 注意

このリポジトリの実行環境からは Cloudflare へデプロイできないため、
`wrangler deploy` と初回接続テストは手動。失敗したら `npm run tail`
（`wrangler tail`）のログを共有してくれれば調査する。
