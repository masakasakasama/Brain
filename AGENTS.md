# Codex Orchestrator Rules

このrepositoryは複数GitHub repository / 複数Codex Cloud threadの中央状態管理用

## Source of truth
- 全体状態: `MASTER_STATE.yaml`
- 各workerの状態: 各対象repoの `CODEX_STATE.md`
- 会話contextよりGitHub上の状態ファイルを優先する

## Worker start
1. `masakasakasama/Brain/Master_STATE.yaml` ではなく正確に `MASTER_STATE.yaml` を読む
2. 自分のrepoエントリを特定する
3. `enabled: true` の場合だけ継続する
4. 対象repoの `AGENTS.md` があれば最優先で読む
5. 対象repoの `CODEX_STATE.md` を読む
6. `Next` から作業を継続する

## Checkpoint
利用上限、時間切れ、エラー、作業区切りの前に必ず対象repoの `CODEX_STATE.md` を更新する

最低限記録する内容:
- Goal
- Done
- Current
- Next
- Blockers
- Verification
- Updated at

## Resume
Codex利用枠が復帰してScheduled taskで再開された場合:
1. このBrainの `MASTER_STATE.yaml` を読む
2. 対象repoの `CODEX_STATE.md` を読む
3. 未完了なら確認質問なしで `Next` から再開
4. 完了済みなら不要な変更をせず終了

## Parallel workers
- 他repoの未commit変更を前提にしない
- repository間依存がある場合はcommit SHA / PR / releaseなどGitHub上の確定状態だけを参照する
- 同一repoを複数threadで同時編集する場合は担当範囲を `CODEX_STATE.md` に明記する
- 同じファイルを複数threadが並列編集しない
