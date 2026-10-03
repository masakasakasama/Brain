import base64
from copy import deepcopy
from datetime import datetime, timezone
import importlib.util
from pathlib import Path
import unittest
import yaml

spec = importlib.util.spec_from_file_location("selector", Path(__file__).parents[1] / "scripts/select_work.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
NOW = datetime(2026, 10, 3, 23, tzinfo=timezone.utc)


class Selection(unittest.TestCase):
    def setUp(self):
        self.master = {"controller": "o/Brain", "policy": {"recent_push_days": 30},
                       "projects": [{"repo": "o/a", "enabled": True}, {"repo": "o/b", "enabled": True}]}
        self.queue = {"policy": {"lease_minutes": 60}, "next_repository": None,
                      "repositories": [dict(repo=f"o/{x}", status="blocked", last_reviewed_head="old",
                          qualifying_activity_at="2026-09-20T00:00:00Z", review_after="2026-10-04T00:00:00Z") for x in "ab"]}
        self.obs = {f"o/{x}": {"head": "old", "pushed_at": f"2026-10-03T{hour}:00:00Z"} for x, hour in [("a", "22"), ("b", "21")]}

    def plan(self):
        return m.plan(self.master, self.queue, self.obs, NOW)

    def test_null_pointer_does_not_hide_changed_blocked_head(self):
        self.obs["o/b"]["head"] = "new"
        self.assertEqual(self.plan()["repository"], "o/b")
        self.assertEqual(self.plan()["action"], "review")
        self.assertEqual(self.queue["repositories"][1]["status"], "blocked")

    def test_recent_push_order_for_multiple_changes(self):
        for obs in self.obs.values(): obs["head"] = "new"
        self.assertEqual(self.plan()["repository"], "o/a")

    def test_retry_rotates_oldest_review_and_honors_cooldown(self):
        self.assertEqual(self.plan()["action"], "waiting")
        for row, hour in zip(self.queue["repositories"], ["21", "20"]):
            row.update(review_after="2026-10-03T22:00:00Z", last_review_at=f"2026-10-03T{hour}:00:00Z")
        self.assertEqual(self.plan()["repository"], "o/b")

    def test_controller_push_does_not_revive_stale_activity(self):
        for row in self.queue["repositories"]: row["qualifying_activity_at"] = "2026-08-01T00:00:00Z"
        for obs in self.obs.values(): obs["head"] = "new-checkpoint"
        self.assertEqual(self.plan()["action"], "activity_review")
        self.assertNotEqual(self.plan()["action"], "work")

    def test_stale_unchanged_activity_remains_inactive(self):
        for row in self.queue["repositories"]: row["qualifying_activity_at"] = "2026-08-01T00:00:00Z"
        self.assertEqual(self.plan()["action"], "inactive")

    def test_new_external_head_on_omitted_registered_worker_is_not_invisible(self):
        self.queue["repositories"] = self.queue["repositories"][1:]
        self.master["projects"][0]["latest_observed_commit"] = "old"
        self.obs["o/a"]["head"] = "new"
        result = self.plan()
        self.assertEqual(result["repository"], "o/a")
        self.assertEqual(result["action"], "activity_review")

    def test_no_eligible_workers_is_not_a_completion_certificate(self):
        self.master["projects"] = []
        self.assertEqual(self.plan()["action"], "inactive")

    def test_only_registered_enabled_workers(self):
        self.master["projects"][0]["enabled"] = False
        self.obs["o/a"]["head"] = "new"
        self.assertIsNone(self.plan()["repository"])

    def test_lease_blocks_parallel_edits_and_expiry_allows_recheck(self):
        row = self.queue["repositories"][0]
        self.obs["o/a"]["head"] = "new"
        row["lease"] = {"owner": "other", "expires_at": "2026-10-04T00:00:00Z"}
        self.assertEqual(self.plan()["action"], "waiting")
        row["lease"]["expires_at"] = "2026-10-03T22:59:00Z"
        self.assertEqual(self.plan()["repository"], "o/a")

    def test_unknown_connection_cannot_mean_completed(self):
        self.obs["o/a"] = {"error": "connection"}
        self.assertEqual(self.plan()["action"], "unknown")

    def test_completed_only_when_all_verified_at_current_head(self):
        for row in self.queue["repositories"]: row["status"] = "completed"
        self.assertEqual(self.plan()["action"], "completed")
        self.obs["o/b"]["head"] = "new"
        self.assertEqual(self.plan()["action"], "review")

    def test_known_usage_limit_skips_selection(self):
        self.assertEqual(m.plan(self.master, self.queue, {}, NOW, True)["action"], "quota_exhausted")

    def test_claim_uses_file_cas_and_does_not_write_worker(self):
        self.obs["o/a"]["head"] = "new"
        calls = []
        def api(path, method="GET", payload=None):
            calls.append((path, method, payload))
            if method == "GET": return {"sha": "file-sha", "content": base64.b64encode(yaml.safe_dump(self.queue).encode()).decode()}
            return {"commit": {"sha": "claim-sha"}}
        self.assertEqual(m.claim(self.plan(), self.master, self.queue, "run-1", NOW, api), "claim-sha")
        self.assertTrue(all(x[0].endswith("/contents/ACTIVE_QUEUE.yaml") for x in calls))
        self.assertEqual(calls[-1][2]["sha"], "file-sha")
        saved = yaml.safe_load(base64.b64decode(calls[-1][2]["content"]))
        self.assertEqual(saved["repositories"][0]["lease"]["owner"], "run-1")

    def test_stale_queue_cannot_claim(self):
        self.obs["o/a"]["head"] = "new"
        remote = deepcopy(self.queue)
        remote["next_repository"] = "o/b"
        def api(path): return {"sha": "changed", "content": base64.b64encode(yaml.safe_dump(remote).encode()).decode()}
        with self.assertRaises(RuntimeError): m.claim(self.plan(), self.master, self.queue, "run", NOW, api)


if __name__ == "__main__": unittest.main()
