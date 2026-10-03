# Brain

複数GitHub repositoryと複数Codex Cloud threadを1つの状態管理で動かすための中央repo

## 使い方

1. `MASTER_STATE.yaml` で動かしたいrepoを `enabled: true` にする
2. 対象repoに `CODEX_STATE.md` を置く
3. Codex threadの最初に `THREAD_BOOTSTRAP.md` の内容を渡す
4. この司令塔チャットのScheduled Automation 1個だけを使用する
5. threadは再開時にBrainと対象repoのstateを読み、続きから作業する

## ファイル

- `AGENTS.md`: 全worker共通ルール
- `MASTER_STATE.yaml`: 全repoの登録・優先順位・稼働状態
- `THREAD_BOOTSTRAP.md`: 新しいCodex threadに最初に渡す指示
- `CODEX_STATE_TEMPLATE.md`: 各repo側の状態ファイル雛形

## 重要

GitHubが永続的な「頭」
Codex threadはworker
Scheduled taskはworkerを起こすトリガー

Codex thread同士が直接会話する前提にはしない

## blocked からの自動再評価

`next_repository: null` は作業消滅を意味しない。登録repoのGitHub head変更を検知し、
変更がないblockedも6時間ごとに1件ずつ再確認する。最新pushと定期再確認を分け、
同じ待機通知は繰り返さない。対象期間はMASTERの30日で統一し、
非司令塔活動の日時をqueueの`qualifying_activity_at`に保存する。

診断（GitHubへの書込みなし）:

```sh
python -m pip install -r requirements.txt
python scripts/select_work.py
python scripts/select_work.py --snapshot observations.json
python scripts/select_work.py --quota-exhausted
python -m unittest discover -s tests
```

編集前は `python scripts/select_work.py --claim <unique-run-id>` を実行する。
GitHub Contents APIのfile SHA比較でleaseを取得し、競合なら編集せず再取得する。
leaseは60分。長い作業は期限前に同じownerで延長してcheckpointする。
既存担当の実行/承認待ちをこのleaseだけで判断せず、取得できなければ編集を保留する。
probe/作業後に当該queue行の`last_reviewed_head`, `last_review_at`,
`review_after`, `status`, `next`, `last_checkpoint`を更新し、自分のleaseを解除してpushする。
観測headが変わっただけではblockedを解除しない。資格情報や実機の検証は別途必要。

selectorはAIを使わない選択プログラムであり、端末のchat送信や利用枠APIは実装しない。
監視/実装の起動は既存の司令塔Automation1個に統合する。
