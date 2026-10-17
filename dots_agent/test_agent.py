import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

SPEC = importlib.util.spec_from_file_location("tatsu_dots_agent", Path(__file__).with_name("agent.py"))
agent = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(agent)


class WatcherTests(unittest.TestCase):
    def test_fingerprint_detects_changes(self):
        item = {"key": "1", "title": "A", "detail": "one"}
        other = {"key": "1", "title": "A", "detail": "two"}
        self.assertNotEqual(agent.fingerprint(item), agent.fingerprint(other))

    def test_baseline_and_deduplication(self):
        with tempfile.TemporaryDirectory() as tmp:
            cfg = Path(tmp) / "config.json"
            cfg.write_text(json.dumps({"sources": [{"id": "sample", "type": "github",
                                                    "repo": "owner/repo"}]}), encoding="utf-8")
            items = [{"key": "one", "title": "A", "detail": "first", "url": ""}]
            with patch.object(agent, "ROOT", Path(tmp) / "data"), \
                 patch.object(agent, "CONFIG", cfg), \
                 patch.dict(agent.FETCHERS, {"github": lambda s: list(items)}), \
                 patch.object(agent, "triage", return_value={"priority": "high",
                                                            "notify": True, "summary": "Changed"}) as t, \
                 patch.object(agent, "notify_telegram", return_value=False):
                agent.run()
                t.assert_not_called()  # first run only baselines
                agent.run()
                t.assert_not_called()  # no new changes
                items.append({"key": "two", "title": "B", "detail": "second", "url": ""})
                agent.run()
                self.assertEqual(t.call_count, 1)
                events = [json.loads(line) for line in
                          (Path(tmp) / "data" / "events.jsonl").read_text(encoding="utf-8").splitlines()]
                self.assertEqual(len(events), 1)
                self.assertEqual(events[0]["priority"], "high")


if __name__ == "__main__":
    unittest.main()
