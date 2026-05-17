# Tatsu Profile 完成レポート

## できたこと

1. Notion に新規トップページ **🧠 Tatsu Profile** を作成（仕事/旅行/趣味/勉強/人生/日記 と並列のワークスペースレベル）
2. その配下に 12 サブページを作成、各ページに初期コンテンツ投入
3. 再現用 Node.js スクリプト（`scripts/create_pages.js`, `scripts/verify.js`）を生成
4. 貼り付け用テキスト 3 ファイル + セットアップ手順書を `outputs/` に生成
5. プロジェクト一式を `masakasakasama/brain` リポジトリ `claude/new-session-bjJxe` ブランチの `tatsu-profile/` に配置

**既存の Notion ページは一切編集していない。** 新規トップページ「Tatsu Profile」とその配下のみ。

## Notion 12 ページ URL 一覧

| # | アイコン | タイトル | URL |
|---|---|---|---|
| — | 🧠 | Tatsu Profile（親） | https://www.notion.so/363290827880811d91b6ca4d9b057b1d |
| 1 | 📋 | README | https://www.notion.so/363290827880812fb548d7804c8bdf0f |
| 2 | 👤 | Identity | https://www.notion.so/363290827880811e96e7f1bdf56b1dd8 |
| 3 | 💎 | Values & Judgment Criteria | https://www.notion.so/36329082788081218f80ffb26ba50c28 |
| 4 | 💼 | Career & Work | https://www.notion.so/363290827880814a9af5e3f0a7c3bd1a |
| 5 | 🎯 | Active Projects | https://www.notion.so/36329082788081fe945ff629e7c40fab |
| 6 | 🌱 | Interests & Learning | https://www.notion.so/3632908278808199b327d0906f2fc916 |
| 7 | 💰 | Finance & Investments | https://www.notion.so/36329082788081c99731e7fd6117f851 |
| 8 | 🏃 | Health & Habits | https://www.notion.so/36329082788081b3bcb1e6761081002a |
| 9 | 🤝 | Relationships | https://www.notion.so/363290827880819a8240ebd78c4bbb99 |
| 10 | 🛠️ | Tools & Environment | https://www.notion.so/36329082788081408cfdd6d1532bf156 |
| 11 | 📜 | Key Decisions Log | https://www.notion.so/3632908278808134889bd1d50641a030 |
| 12 | 🎨 | Working Style for AI | https://www.notion.so/363290827880810bab1ec9efd4e74e6f |

## リポジトリ

- リポジトリ: `masakasakasama/brain`
- ブランチ: `claude/new-session-bjJxe`
- パス: `tatsu-profile/`

仕様では専用 private repo `tatsu-profile` を想定していたが、この実行環境は
`brain` リポジトリ／指定ブランチに固定されているため、サブディレクトリとして配置した。
専用 repo に分離したい場合は `tatsu-profile/` の中身を新規 private repo にコピーして push すればそのまま動く。

## 次にやる手動作業

1. `outputs/chatgpt_about_me.txt` / `chatgpt_how_to_respond.txt` を ChatGPT の Custom Instructions に貼り付け
2. `outputs/claude_personal_preferences.txt` を Claude の Personal Preferences に貼り付け
3. ChatGPT / Claude の Notion コネクタが接続済みか確認
4. モバイル Claude アプリで GitHub `brain` repo を接続
5. 詳細は `outputs/SETUP_GUIDE.md` 参照

## テスト方法

ChatGPT と Claude の新規チャットでそれぞれ「俺の判断基準は？」と聞く。
両方が Notion「Tatsu Profile」の Values & Judgment Criteria を参照して答えれば成功。

## scripts の再実行について

Notion ページは既に MCP コネクタ経由で作成済み。`scripts/create_pages.js` は
別環境で再現したい場合用（`.env.local` に Internal Integration Token と
PARENT_PAGE_ID を設定して `npm install && npm run create`）。既に子ページが
ある場合は重複防止で停止する（`FORCE=1` で強制実行）。
