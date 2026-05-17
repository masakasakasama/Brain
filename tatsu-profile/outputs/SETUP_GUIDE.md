# Tatsu Profile セットアップ完了ガイド

このプロジェクトで完成したものを使うための最終手順。

## ステップ1: ChatGPT Custom Instructions 設定（5分）

1. ChatGPT を開く -> 左下のプロフィール -> Customize ChatGPT
2. "What would you like ChatGPT to know about you?" フィールドに
   `outputs/chatgpt_about_me.txt` の内容を全文コピペ
3. "How would you like ChatGPT to respond?" フィールドに
   `outputs/chatgpt_how_to_respond.txt` の内容を全文コピペ
4. Save

## ステップ2: ChatGPT Notion コネクタ有効化（既設定なら飛ばし）

1. ChatGPT 設定 -> Apps & Connectors
2. Notion を Connect（OAuth でNotionにログイン）
3. Tatsu Profile ページにアクセス権を付与

## ステップ3: Claude Personal Preferences 設定（3分）

1. Claude.ai を開く -> 設定（左下プロフィール） -> Profile
2. Personal Preferences フィールドに
   `outputs/claude_personal_preferences.txt` の内容を全文コピペ
3. Save

## ステップ4: Claude Notion MCP 確認（既接続なら飛ばし）

1. Claude設定 -> Connectors
2. Notion が接続済み・有効か確認

## ステップ5: モバイル Claude Code 接続（Android Galaxy S26 Ultra）

このプロジェクトは現在 `masakasakasama/brain` リポジトリの
`claude/new-session-bjJxe` ブランチ内 `tatsu-profile/` に入っている。

1. Google Play から公式「Claude」アプリ（Anthropic製）をインストール（既にあれば省略）
2. アプリ起動 -> 左下プロフィール -> 設定 -> Connectors -> GitHub
3. GitHub アカウントで OAuth 認証 -> `brain` リポジトリへのアクセスを許可
4. チャット画面の「+」ボタン -> Add from GitHub -> `brain` を選択
5. テスト: 「tatsu-profile/scripts/create_pages.js の中身を説明して」と聞く
   -> 中身が読まれて応答が来れば成功

専用 `tatsu-profile` repo に分離したい場合は、`tatsu-profile/` の中身を
新規 private repo にコピーして push すればそのまま動く（`.gitignore` 同梱済み）。

## ステップ6: 動作テスト

両AIで新規の普通のチャットを開いて、それぞれに次を投げる:

「俺の判断基準は？」

期待される動作:
- 両AIともNotion「Tatsu Profile」の Values & Judgment Criteria ページを参照
- そこに書かれた判断基準を踏まえて応答

トラブルシューティング:
- ChatGPT が Notion を読まない -> コネクタ接続を確認、明示的に「Notion参照して」と頼む
- Claude が読まない -> Notion MCP の接続を確認、Tatsu Profile ページがアクセス可能か確認

## 次のアクション

1. Notion で各ページを開いて初期コンテンツを確認、必要に応じて編集
2. 特に Values & Judgment Criteria と Career の中長期欄を自分で詳細化
3. 1〜2週間運用して、不足を感じた領域を Notion に追加
4. 「毎回必ず読ませる」を強制したい場合、自前MCPサーバー案に進化させる
