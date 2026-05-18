# tatsu-profile-mcp (Val Town)

Tatsu Profile（Notion）をライブ参照する **リモート MCP サーバー**。
単一ファイル `main.http.ts` を Val Town に貼るだけ。CLI / Cloudflare / GitHub設定すべて不要。

> **重要**: Val Town は **ファイル名に "http" が含まれる**ファイルだけを
> HTTPエンドポイントとして公開する。ファイル名は必ず `main.http.ts`。
> `main.ts` のままだと Run しても何も起きない（エンドポイント未生成）。

## ツール

| tool | 用途 |
|---|---|
| `search` | プロフィールから関連セクションを検索（ChatGPT互換） |
| `fetch` | セクション本文を全文取得（ChatGPT互換） |
| `get_tatsu_profile` | 12セクション一括 or 単一取得（Claude向け） |
| `append_to_section` | 指定セクション末尾に追記（追加のみ・安全） |
| `update_section` | セクション内テキストを find→replace で訂正 |
| `remember` | 事実を適切なセクションへ自動振り分けして記録 |
| `get_digest` | 全体を1ページ圧縮した Context Digest を取得（軽い・最初に呼ぶ用） |
| `rebuild_digest` | Context Digest を最新内容で再生成 |
| `add_decision` | Decisions DB に構造化レコード追加（日付/理由/結果/状態） |
| `add_project` | Projects DB に構造化レコード追加 |
| `backup_now` | プロフィール全体を Val Town ストレージにスナップショット（14世代） |
| `list_backups` | バックアップ一覧 |

### 設計メモ（堅牢性）
- 実証済みの read/write 経路を最前段に固定。新機能は全て try/catch 隔離 ——
  どれが失敗してもサーバーは落ちず、該当ツールがエラー文を返すだけ。
- `Changelog` / `Context Digest` ページは profile 読み取りから除外（ノイズ防止）。
  全書き込み（append/update/remember/add_*/backup）は `Changelog` に自動記録。
- バックアップは Val Town blob ストレージ（外部トークン不要・自己完結）。
- Decisions DB / Projects DB は **追加的**。読み取り経路には一切影響しない。

## 事前準備（一度だけ）

Notion の Internal Integration トークンが必要（Anthropicコネクタとは別物）。
作成済みなら飛ばす:

```
□ https://www.notion.so/profile/integrations → New integration → Internal
  Name: Tatsu Profile MCP / Capabilities: Read content
□ Internal Integration Secret（ntn_...）をコピー
□ Notion「🧠 Tatsu Profile」ページ → ... → 接続 → Tatsu Profile MCP を追加
```

## デプロイ（スマホのブラウザだけで完結）

1. `val.town` にサインイン（GitHub/メール、普通のモバイルページ）
2. 右上 **New → HTTP val**
3. `main.http.ts` の中身を全部コピペ
4. 左の歯車 or **Settings → Environment Variables** で登録:

   | 名前 | 値 |
   |---|---|
   | `NOTION_TOKEN` | Notion の `ntn_...` |
   | `AUTH_SECRET` | URLに入れる長いランダム文字列 |
   | `PARENT_PAGE_ID` | （任意。未設定なら 🧠 Tatsu Profile に固定） |

5. val は自動保存・自動デプロイ。URL は `https://<you>-<valname>.web.val.run`
6. 動作確認: その URL を開いて `tatsu-profile-mcp ok` が出ればOK

## 接続

**コネクタURL**（`AUTH_SECRET` を第1パスに入れる）:

```
https://<you>-<valname>.web.val.run/<AUTH_SECRET>/mcp
```

- **Claude**（アプリ/Web）: 設定 → Connectors → Add custom connector → 上のURL
- **ChatGPT**: 設定 → Connectors → カスタム追加 → 同URL（認証 No authentication）

## 仕組み・注意

- ステートレス Streamable HTTP（JSON応答）で MCP を実装。SDK不使用、依存ゼロ。
- Notion を5分キャッシュでライブ読み（Notionで編集すれば最大5分で反映）。
- 認証は `AUTH_SECRET` を URL パスに入れる方式。個人1コネクタなら実用上十分。
  URLは秘密扱い（人に見せない）。
- このリポジトリの実行環境からはデプロイ・テスト不可。Val Town上で
  動かしてみて不調なら Logs を共有してくれれば調査する。

## 他ホストで動かす場合

`main.http.ts` は web 標準 `fetch` ハンドラ。Deno Deploy なら末尾を
`Deno.serve(handler)` に差し替えるだけで動く（Val Town は `export default` のまま）。
