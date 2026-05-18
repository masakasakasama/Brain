// Source-of-truth content for the 12 Tatsu Profile sub-pages.
// Each `body` line uses a tiny markdown dialect:
//   "## x"  -> heading_2
//   "### x" -> heading_3
//   "> x"   -> quote
//   "- x"   -> bulleted_list_item
//   ""      -> skipped
//   other   -> paragraph

const PAGES = [
  {
    icon: "📋",
    title: "README",
    body: `## このページについて
このページツリーは、Tatsu のAI（Claude / ChatGPT）に俺のコンテキストを構造化して提供する目的で作成。

## AIへの読み方指示
- 個人的な判断・推奨・助言を求められた時、関連ページを参照してから答える
- Claude ネイティブメモリや ChatGPT Memory と矛盾がある場合、このページが優先
- 重要な決定や新しい知見が会話で発生した場合、該当ページへの追記を提案する

## 更新ルール
- 新しい決定 -> Key Decisions Log に追記
- 新しい興味 -> Interests & Learning
- プロジェクト追加・完了 -> Active Projects 更新
- 価値観の変化 -> Values & Judgment Criteria 見直し

## 構成
12サブページ（README含む）。各サブページは独立して読めるが、相互参照あり。`,
  },
  {
    icon: "👤",
    title: "Identity",
    body: `## 基本情報
- 名前: Tatsu
- 年齢: 28歳
- 国籍: 日本
- 居住地: 東京・元浅草（台東区）
- 物件: Mainstage Motosasakusa III、家賃 ¥200,000/月
- 身体: 身長183cm、体重65kg

## 所属
- 現職: BayCurrent Consulting（ITコンサルタント）
- 前職: Mazda（自動車ソフトウェア開発）

## パートナー
- Rebecca（ドイツ・ハイデルベルク在住、不動産所有）
- 結婚準備フェーズ

## 国際性
- パートナーがドイツ在住、ドイツ移住・国際生活の可能性あり
- ポーランド・ドイツ文化に親和性
- ドイツ語ゼロから学習中`,
  },
  {
    icon: "💎",
    title: "Values & Judgment Criteria",
    body: `> このページは Tatsu 自身が継続的に追記・編集する想定。初期は叩き台。

## 検証重視
- 推測ではなく検索・データで確認する
- 公式情報源・サービスの正当性は見た目や価格で判断しない

## コミュニケーション
- 結論から先に、前置きやお世辞は不要
- 簡潔さと必要な深さの両立

## 意思決定
- データ所有・ベンダーロックを避ける
- コストパフォーマンス重視（無料/低コストを優先、価値ある対象には払う）
- 時間を金で買う観点も意識

## 国際志向
- 国境を越えた選択肢を当然に検討
- 日本国内最適化に閉じない

## 金融
- インデックス長期投資（S&P500中心）
- 短期投機は基本やらない

## 避けたいこと
- 過度な抽象化・複雑化
- 不要な仕組み導入
- 推測・想像での回答`,
  },
  {
    icon: "💼",
    title: "Career & Work",
    body: `## 現職: BayCurrent Consulting（ITコンサルタント）
- 入社: 中途、自動車業界からの転身
- 昇進: 2025年
- 年収: 約 ¥10,000,000

## 前職: Mazda
- 役割: 自動車ソフトウェア開発エンジニア
- 経験領域: 自動車組み込みSW、AAOS、HMI開発等

## 現状の課題
- 現プロジェクトの評価が悪い
- 4月から異動希望、キャリアマネージャーに相談済み

## 中長期キャリア志向
- (Tatsu追記領域: 5年後・10年後の理想像、優先順位など)

## 専門領域
- 自動車ソフトウェア（過去経験）
- ITコンサルティング（現職）
- Android開発（個人プロジェクトで実践中）`,
  },
  {
    icon: "🎯",
    title: "Active Projects",
    body: `## 個人開発
- Android株価ホーム画面ウィジェット — Jetpack Glance + Claude Code。状態: 進行中
- 個人キャッシュフローダッシュボード — ダークテーマHTML + Chart.js、3月〜7月。状態: 反復改善中
- 統合AIメモリシステム（このプロジェクト） — Claude/ChatGPT横断のコンテキスト基盤。状態: Notion Tatsu Profile 構築フェーズ

## 学習・自己投資
- ドイツ語ゼロから
- Stoic 哲学

## 旅行計画
- スペイン旅行（予定）
- 結婚指輪購入（予定）

## 完了済み（参考）
- LAゴールデンウィーク旅行（2026/4/25-5/4、約 ¥607,000）`,
  },
  {
    icon: "🌱",
    title: "Interests & Learning",
    body: `## ライフスタイル
- ゴルフ
- 筋トレ（継続）
- オートファジー、生産性最適化

## 旅行（強い興味）
- ポーランド・ワルシャワ
- ベトナム・ハノイ
- ドイツ全般

## 過去の渡航国
韓国、香港、ベトナム、ポーランド、トルコ、ドイツ、オランダ（アムステルダム）、米国（LA）

## 学習中
- ドイツ語（ゼロから、Rebecca関連で動機強い）
- Stoic 哲学
- インデックス投資（S&P500中心）

## 知的関心
- 地政学（ホルムズ海峡、米中、欧州情勢）
- 半導体産業（Rapidus、TSMC/Samsung、GAA、日本装置産業）
- 文化的親和性: ポーランド、ドイツ`,
  },
  {
    icon: "💰",
    title: "Finance & Investments",
    body: `## 収入
- 年収: 約 ¥10,000,000（BayCurrent）

## 固定支出
- 家賃: ¥200,000/月

## 投資
- NISA: S&P500 インデックス、月 ¥50,000 積立（現在残高 約 ¥2,500,000）
- SBI 課税口座: あり（金額は別途記載）

## カード戦略
- メイン: 三井住友 Platinum Preferred VISA（年間支出 ¥4,000,000〜5,000,000）
- 海外利用: 同上 Platinum Preferred（為替手数料 ≈ 0.63% net）

## 投資方針
- インデックス長期積立を基本
- 短期投機・個別株勝負はしない
- ベンダーロック/手数料高い金融商品は避ける

## 中長期目標
- (Tatsu追記領域: FIRE志向の有無、目標資産額など)`,
  },
  {
    icon: "🏃",
    title: "Health & Habits",
    body: `## 身体
- 身長 183cm、体重 65kg

## トレーニング
- 筋トレ継続

## サプリ
- クレアチン 5g（Kentai、タブレット）
- オメガ3: Doctor's Choice EPA600/DHA400（2カプセル）
- マルチビタミン・ミネラル: Nature Made（1錠）
- D3は摂取せず

## 過去に検討・調査
- ブライダル健康診断
- ICL眼内コンタクトレンズ手術
- V-beam レーザー（PIE治療）

## 健康トラッキング
- Apple Health（iPhone、2018〜2026年3月）
- Samsung Health（Galaxy S26 Ultra、2026年3月〜現在）`,
  },
  {
    icon: "🤝",
    title: "Relationships",
    body: `## パートナー: Rebecca
- 国籍: ドイツ
- 在住: ドイツ（ハイデルベルク含む）
- 不動産: ハイデルベルクに所有
- 関係性: 結婚準備中
- 共有支出: 旅行・経費の精算記録あり

## 家族
- (Tatsu追記領域)

## 仕事関係キーパーソン
- キャリアマネージャー（BayCurrent内、異動相談中）
- (その他は Tatsu が追記)`,
  },
  {
    icon: "🛠️",
    title: "Tools & Environment",
    body: `## ハードウェア
- PC: Lenovo IdeaPad Pro 5i（Windows 11）
- スマホ: Galaxy S26 Ultra 256GB Cobalt Violet（2026年3月〜）。前: iPhone 16 Pro Max（〜2026年3月）

## 開発ツール
- IDE: VSCode、Android Studio
- CLI: Claude Code
- バージョン管理: Git

## AIサービス
- Claude Pro / Max
- ChatGPT Plus

## ノート・知識管理
- Notion Plus（個人の有料プラン）。トップ階層: 仕事 / 旅行 / 趣味 / 勉強 / 人生 / 日記 + 本ページ群「Tatsu Profile」

## 支払い
- カード: 三井住友 Platinum Preferred VISA（メイン）`,
  },
  {
    icon: "📜",
    title: "Key Decisions Log",
    body: `> 時系列で記録（最新が上）。各項目: 日付 / 決定内容 / 理由 / 結果

## 2026年5月（進行中）
- 統合AIメモリ層を Notion 中央化方式で構築
- 理由: Claude ネイティブメモリだけでは構造化不足、ChatGPT 側との分断、可視性・編集性の欠如
- 結果: 評価中

## 2026年4-5月
- ゴールデンウィーク旅行先を LA + Las Vegas に決定
- 理由: ホルムズ海峡危機による中東経由便のリスク回避
- 結果: 実行済み、約 ¥607,000

## 2026年3月
- iPhone 16 Pro Max -> Galaxy S26 Ultra 256GB Cobalt Violet に移行
- 理由: (Tatsu追記)
- 結果: 移行完了、健康データは Samsung Health に分岐

## 2025年（時期未確定）
- BayCurrent で昇進
- 理由: 業務評価
- 結果: 年収 ≈ ¥10M に上昇`,
  },
  {
    icon: "🎨",
    title: "Working Style for AI",
    body: `## 応答の基本ルール
- 結論から先に述べる。「結論から言うと」等の前置きフレーズは使わず、いきなり結論から書き始める
- 余計な前置き・お世辞・確認質問の連発を避ける
- 簡潔に、ただし必要な深さは確保

## 事実確認
- 技術スペック・規制・現在情報・公式サービスの正当性は推測せず必ず検索で確認
- 「I'll check」と明示してから検索
- 見た目や価格で判断しない

## リンク・参照
- Amazon は amazon.co.jp（amazon.com は日本からアクセス不可）
- 推奨はAndroid互換前提（Galaxy S26 Ultra）

## ビジュアル成果物
- HTMLインフォグラフィックはダークテーマ: 背景 #0f1117 / 本文 #f0f0f0 / 見出し #ffffff / 副次 #b0bcd4 / 薄色 #8892b0

## Notion 連携
- 個人的判断・推奨が必要な場面で、Notion「Tatsu Profile」ページツリーを参照
- 重要な決定や新知見は該当ページへの追記を提案

## 禁止事項
- 推測・想像での回答（必ず検証）
- 過度な謝罪・へつらい
- 1メッセージで2問以上の確認質問連発
- 28HMI関連プロジェクト情報のメモリ蓄積（Nissan 28HMI、AAOS、RRO、CarConfig、Codebeamer、Figma連携、画面縮小、CDC/SA8295P、VHAL、Anki 等）

## 言語
- 日本語で応答
- 技術用語・固有名詞は英語のまま`,
  },
];

module.exports = { PAGES };
