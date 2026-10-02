# Brain

複数GitHub repositoryと複数Codex Cloud threadを1つの状態管理で動かすための中央repo

## 使い方

1. `MASTER_STATE.yaml` で動かしたいrepoを `enabled: true` にする
2. 対象repoに `CODEX_STATE.md` を置く
3. Codex threadの最初に `THREAD_BOOTSTRAP.md` の内容を渡す
4. 各threadにScheduled taskを設定する
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
