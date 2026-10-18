import json
import sqlite3
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

import agent as core
import news_watch


class HomeDeliveryTests(unittest.TestCase):
    def test_retries_and_acks_only_exact_batch(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = sqlite3.connect(Path(tmp) / "news.sqlite3")
            db.execute("CREATE TABLE home_outbox (batch_id TEXT PRIMARY KEY,queued_at TEXT,payload TEXT,delivered INTEGER DEFAULT 0)")
            batch_id = "a" * 64
            payload = {"batchId": batch_id,"capturedAt":"2026-10-18T00:00:00Z",
                       "headlineCount":1,"digest":"one","alerts":[]}
            db.execute("INSERT INTO home_outbox VALUES (?,?,?,0)",
                       (batch_id, "2026-10-18T00:00:00Z", json.dumps(payload)))
            db.commit()
            with patch.dict("os.environ", {"TATSU_HOME_AUTH_TOKEN":"test-secret"}), \
                 patch.object(core, "request_json", return_value={"accepted":True,"batchId":batch_id}) as send:
                news_watch.flush_home_outbox(db,{})
                self.assertEqual(send.call_count,1)
                self.assertIn("Bearer test-secret",str(send.call_args))
                self.assertEqual(db.execute("SELECT delivered FROM home_outbox").fetchone()[0],1)
                news_watch.flush_home_outbox(db,{})
                self.assertEqual(send.call_count,1)

    def test_delivery_failure_keeps_outbox(self):
        with tempfile.TemporaryDirectory() as tmp:
            db = sqlite3.connect(Path(tmp) / "news.sqlite3")
            db.execute("CREATE TABLE home_outbox (batch_id TEXT PRIMARY KEY,queued_at TEXT,payload TEXT,delivered INTEGER DEFAULT 0)")
            batch_id = "b" * 64
            db.execute("INSERT INTO home_outbox VALUES (?,?,?,0)",
                       (batch_id, "2026-10-18", json.dumps({"batchId":batch_id})))
            db.commit()
            with patch.dict("os.environ", {"TATSU_HOME_AUTH_TOKEN":"test-secret"}), \
                 patch.object(core, "request_json", side_effect=OSError("offline")):
                news_watch.flush_home_outbox(db,{})
                self.assertEqual(db.execute("SELECT delivered FROM home_outbox").fetchone()[0],0)


if __name__ == "__main__":
    unittest.main()
