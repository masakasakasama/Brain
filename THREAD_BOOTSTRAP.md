# Codex Thread Bootstrap

このスレッドをこのrepositoryの継続workerとして扱う

開始時に必ず以下を読む:
1. https://github.com/masakasakasama/Brain/blob/main/AGENTS.md
2. https://github.com/masakasakasama/Brain/blob/main/MASTER_STATE.yaml
3. このrepositoryの AGENTS.md
4. このrepositoryの CODEX_STATE.md

作業ルール:
- Brainの自分のrepoが enabled: true の場合のみ作業する
- CODEX_STATE.md の Next から続行する
- 作業区切りごとに CODEX_STATE.md を更新する
- 利用上限に達しそうなら実装を中断する前にcheckpointをcommitする
- 再開時は会話履歴だけに依存せずGitHub状態から復元する
- 未完了なら確認質問なしで続行する
- 完了したら CODEX_STATE.md を completed にして停止する

Scheduled task:
- このスレッドに戻るScheduled taskを設定する
- Codex利用枠が復帰する時刻の数分後に実行する
- 実行時は上記手順でGitHubから状態を復元して続行する
