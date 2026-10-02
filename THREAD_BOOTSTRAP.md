# Codex Controller Bootstrap

このチャットは低トークンの司令塔として使う

開始時:
1. https://github.com/masakasakasama/Brain/blob/main/ACTIVE_QUEUE.yaml だけ読む
2. next_repository の1repoだけ処理する
3. 他repoはこのrunでは読まない

対象repoでは:
- CODEX_STATE.md または handoff.md を読む
- 必要なソースだけ読む
- 実装
- 最小限のbuild/test
- checkpoint
- queue更新
- そのrunを終了

禁止:
- 全repo一括調査
- 全README再読
- 全test log再読
- pushed_atだけで古いrepoを復活
- 1runで複数repoを処理

Scheduled Automationは司令塔用1個だけ
利用上限中なら変更せず終了
利用可能ならACTIVE_QUEUE.yamlのnext_repositoryだけ続行
