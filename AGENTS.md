# Codex Orchestrator Rules

GitHub が正本。ユーザーの再開指示は毎回必要ない。既存の司令塔 Automation 1個だけを使う。

## 必要な変更だけ行う（必須）
- 最新の明示的なユーザー指示を優先し、対象repoの保存済み `Next` の達成に直接必要な実装・修正・検証だけ行う。独自に別の目標や作業を作らない。
- 編集する各ファイルは、その指示またはNextとの必要性を説明できるものに限る。必要なstate/checkpoint更新は最小限にし、既存履歴を無関係に書き直さない。
- 求められていない機能追加、リファクタリング、依存更新、改名、全体整形、対象repo追加、対象期間・設定・Automationの変更は禁止。明示的に依頼された場合だけ行う。
- blockerがあれば、現在のNext内で独立して進められる作業だけ続ける。待ち時間を埋めるための改善・別作業を始めない。

## トークン・確認・報告を最小限にする（必須）
- 毎回必要なBrain/stateの最新確認は維持する。その他は選択した1repoの必要なファイル・差分・短い診断結果だけを読む。全repoの文書、長い履歴・ログの一括読込みは禁止。
- 変更範囲に合った既存のbuild/test/lintを優先する。テスト追加は必要な挙動・不具合を検証する場合に限る。成功後に変更・新しい失敗・未解決事項がなければ広範な検証を繰り返さない。
- 同じ状態・同じblockerの再確認は保存された期限または新しい証拠がある場合だけ行う。変更なしのstate更新・空commit・同じ待機通知を繰り返さない。
- 報告は実際の変更、検証結果、残る障害・次の必要作業を短く示す。重複した説明や長い作業実況でトークンを消費しない。

## 起動
- 最新 `AGENTS.md`、`MASTER_STATE.yaml`、`ACTIVE_QUEUE.yaml` を読み直す。
- 利用上限中と判明していれば変更せず終了。利用枠の残量/回復時刻が取得できなければ回復を断言しない。
- `python scripts/select_work.py` で登録対象の GitHub metadata を軽量確認する。全 README/全ソースを読む必要はない。
- `next_repository: null` や全件 blocked は監視終了条件ではない。変更された head を優先し、変更なしの blocked も6時間ごとに1件ずつ再確認する。
- 同じ「全件 blocked」報告を毎回通知しない。状態/障害/検証結果が変わった時だけ具体的な差分を報告する。

## 対象
- 対象期間は MASTER_STATE の `policy.recent_push_days`（30日）。ACTIVE_QUEUE の期間も一致させる。
- `enabled: true` の登録repoだけ。非司令塔の実活動日時を `qualifying_activity_at` に保存する。
- 自分の実装/検証/state/checkpoint push で活動期限を延長しない。実活動が期間外なら編集しない。
- 現在のqueue内で新しい外部pushが見つかったらcommitの担当・変更内容を確認して活動日時を更新する。未完了repoをキューから消して監視対象外にしない。
- MASTERに登録・有効だがqueueにないrepoはmetadataの比較までに留める。新たな対象追加やqueue範囲の拡張はユーザーの明示指示がある場合だけ行う。

## 選択と実行
1. selector の `review` / `work` 対象1件を取得。changed head/作業可能repoは pushed_at 降順。定期blocked再確認は最後に確認した時刻が古い順。
2. `python scripts/select_work.py --claim <一意run識別子>` でGitHubにleaseを取得してから対象を編集。競合なら最新Brainを読み直す。expiryまで他runは同repoを編集しない。
3. 対象の最新headで短いstateを読み、AGENTS/README/handoff/CODEX_STATEがあれば必要な範囲を読む。他担当が実行中・承認待ち・状態不明なら編集せず保留する。
4. blockedは具体的な接続・証跡・設定のread-only probeを行う。pushがあっただけで解除しない。既存stateのNextにローカルでできる実装/検証があれば進める。
5. 外部条件待ちと実装作業を分ける。実機/本番確認が残っていても、別の独立した未完了Nextを固定停止しない。ユーザー確認不要の範囲を実装・build/test/lint・修正する。
6. worker側に Done/Current/Next/Blockers/Verification/Updated at、必要な証跡を保存。親headを再確認し、並行変更を保存してcommit/push。force push禁止。
7. Brainのqueue当該行にstatus/next/last_checkpoint/last_reviewed_head/last_review_at/review_afterを更新。変更なしblockedならreview_afterは6時間後。自分のleaseを解除し次のpointerを設定。
8. MASTERにも確定worker SHA/状態と司令塔checkpointを保存し、そのrunは終了。

## 不明・終了・checkpoint
- 不明/接続失敗/権限不足を完了扱いにしない。probe結果と次のprobe条件を記録する。
- controller checkpointや空commitだけを繰り返さない。変更なし待機は終了してよい。
- 作業があれば中断前に必ずGitHubへcheckpoint。期限切れleaseの回収前にworkerの最新状態を確認する。
- 全対象の未完了作業が本当にcompletedで、取得不能/未確認がない場合だけ既存Automationを停止する。
- Scheduled runのworker実装は1repo。複数repoのmetadata確認とBrain保守は可能。repo別Automation、新規chat/forkを作らない。
