# tatsu-profile

Personal Notion profile + AI custom instructions setup.

ClaudeとChatGPTの普通のチャットで、Tatsu のコンテキストを一貫して踏まえた
応答を得るための環境構築プロジェクト。

## 構成

```
tatsu-profile/
├── scripts/
│   ├── pages.js          # 12ページの内容（source of truth）
│   ├── create_pages.js   # Notion APIで12ページ作成（再現用）
│   └── verify.js         # ページツリー + outputs の検証
├── outputs/
│   ├── chatgpt_about_me.txt          # ChatGPT Custom Instructions (about)
│   ├── chatgpt_how_to_respond.txt    # ChatGPT Custom Instructions (style)
│   ├── claude_personal_preferences.txt
│   ├── SETUP_GUIDE.md                # 貼り付け・接続手順
│   └── notion_page_ids.json          # 作成済みページID（git-ignored）
├── .env.local.example
├── REPORT.md
└── package.json
```

## Notion ページの作り方

このプロジェクトの Notion ページは Notion コネクタ経由で作成済み
（URL一覧は `REPORT.md`）。別環境で再現するには:

```bash
cp .env.local.example .env.local   # NOTION_TOKEN, PARENT_PAGE_ID を記入
npm install
npm run create                     # 12ページ作成
npm run verify                     # 検証
```

## セットアップ

`outputs/SETUP_GUIDE.md` を参照。

## セキュリティ

`.env.local` と `outputs/notion_page_ids.json` は `.gitignore` 済み。
絶対にコミットしないこと。
