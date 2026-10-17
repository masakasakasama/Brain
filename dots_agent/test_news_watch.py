import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

DIR = Path(__file__).parent
sys.path.insert(0, str(DIR))
import agent as core
import news_watch


class NewsWatcherTests(unittest.TestCase):
    def test_clean_title(self):
        self.assertEqual(news_watch.clean("<b>Hello</b> &amp; World"), "Hello & World")

    def test_once_per_batch_and_initial_baseline(self):
        with tempfile.TemporaryDirectory() as tmp:
            data = Path(tmp)
            config = data / "config.json"
            config.write_text(json.dumps({"sources": [
                {"id": "ai-news", "type": "rss", "url": "https://invalid.example/rss"}]}), encoding="utf-8")
            feed = [{"key": "one", "title": "Existing article", "detail": "text", "url": "https://a.example"}]
            model_result = ({}, {"digest": "News summary", "alerts": [
                {"id": 0, "score": 88, "summary": "Important"}]}, [{"input_tokens": 10}])
            with patch.object(core, "CONFIG", config), \
                 patch.object(core, "ROOT", data / "state"), \
                 patch.object(core, "fetch_rss", side_effect=lambda s: list(feed)), \
                 patch.object(news_watch, "analyze", return_value=model_result) as analysis, \
                 patch.object(core, "notify_telegram", return_value=False):
                news_watch.run()
                news_watch.run()
                analysis.assert_not_called()
                feed.append({"key": "two", "title": "New article", "detail": "details",
                             "url": "https://b.example"})
                news_watch.run()
                self.assertEqual(analysis.call_count, 1)
                news_watch.run()
                self.assertEqual(analysis.call_count, 1)
                events = (data / "state" / "events.jsonl").read_text(encoding="utf-8").splitlines()
                self.assertEqual(len(events), 1)
                self.assertEqual(json.loads(events[0])["count"], 1)

    def test_error_does_not_acknowledge_headline(self):
        with tempfile.TemporaryDirectory() as tmp:
            data = Path(tmp)
            config = data / "config.json"
            config.write_text(json.dumps({"sources": [
                {"id": "world-news", "type": "rss", "url": "https://invalid.example/rss"}]}), encoding="utf-8")
            feed = [{"key": "one", "title": "Existing", "detail": "", "url": ""}]
            with patch.object(core, "CONFIG", config), \
                 patch.object(core, "ROOT", data / "state"), \
                 patch.object(core, "fetch_rss", side_effect=lambda s: list(feed)), \
                 patch.object(news_watch, "analyze", side_effect=RuntimeError("API down")):
                news_watch.run()
                feed.append({"key": "two", "title": "New", "detail": "", "url": ""})
                with self.assertRaises(RuntimeError):
                    news_watch.run()
                self.assertEqual(
                    len(news_watch.read_updates(
                        __import__("sqlite3").connect(data / "state" / "news.sqlite3"),
                        [{"id": "world-news", "type": "rss", "url": "https://invalid.example/rss"}])[0]), 1)


if __name__ == "__main__":
    unittest.main()
