# Codex Orchestrator Rules

このrepositoryは複数GitHub repositoryを低トークンで継続開発する司令塔

## 最重要: Token budget
- 1回のScheduled runで処理するrepoは必ず1個だけ
- 起動時に全repoを巡回しない
- 全repoのREADME / AGENTS.md / handoff.md / CODEX_STATE.mdを一括で読まない
- まず `ACTIVE_QUEUE.yaml` だけを読む
- `next_repository` のrepoだけを開く
- そのrepoでは `CODEX_STATE.md` または `handoff.md` のどちらか短い方を最初に読む
- 必要になったファイルだけ追加で読む
- 既に検証済みの長いtest logを再読しない
- 同じ事実をBrainと各repoへ重複保存しない

## Active selection
- 自動巡回対象は直近7日以内にユーザー/既存開発で動いていたrepoを基本とする
- 司令塔自身が作ったcheckpoint commit / state更新による pushed_at は活動判定に使わない
- 古いrepoを自動で復活させない
- 新しいrepoを対象にする必要が出た場合だけqueueへ追加する

## Run
1. `ACTIVE_QUEUE.yaml` を読む
2. `next_repository` を1つ取得
3. そのrepoだけ作業する
4. 実装・必要なtestを行う
5. repo側の `CODEX_STATE.md` または `handoff.md` を短く更新
6. commit / push
7. `ACTIVE_QUEUE.yaml` の当該repoを更新して次repoへポインタを進める
8. そのrunは終了する

## State
Brainに保持するのは以下だけ
- repo
- status
- next
- last_checkpoint
- next_repository

詳細な検証ログ、変更ファイル一覧、長い履歴は各repo側へ置く

## Resume
利用枠回復後のScheduled runでも同じ
- ACTIVE_QUEUE.yamlだけ読む
- next_repository 1個だけ再開
- 全repo再スキャン禁止

## Completion
repoが完了または人間待ちならqueueの次へ進む
全queueが完了した場合だけAutomationを停止する
