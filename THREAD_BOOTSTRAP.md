# Controller resume

最新BrainのAGENTS.md・MASTER_STATE.yaml・ACTIVE_QUEUE.yamlを読む。
python scripts/select_work.py を実行し、変更されたheadまたは期限の来たblockedを1件確認する。
next_repository=nullでも監視を止めない。変更がなければ同じ待機通知を繰り返さない。
--claim <一意run ID> でGitHub leaseを取得し、最新worker stateのNextを実装・検証・push。
worker stateとBrainへcheckpointし、lease解除・次対象選択でそのrunを終える。
利用上限中と判明した場合は変更しない。残量・回復時刻は推測しない。
Automationは既存の司令塔1個だけ。全対象completedかつunknownなしの場合のみ停止する。
