#!/usr/bin/env python3
"""Read-only GitHub planner; --claim alone acquires an optimistic GitHub lease.

No AI, worker edits, quota inference, new threads, or automatic completion.
"""
import argparse
import base64
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timedelta, timezone
import json
from pathlib import Path
import subprocess
import sys

import yaml

ROOT = Path(__file__).resolve().parents[1]


def timestamp(value):
    return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(timezone.utc)


def gh(path, method="GET", payload=None):
    args = ["gh", "api", path, "--method", method]
    if payload is not None:
        args += ["--input", "-"]
    result = subprocess.run(args, input=json.dumps(payload) if payload is not None else None,
                            capture_output=True, text=True, timeout=30)
    if result.returncode:
        # Never print CLI stderr: it may contain credential-related diagnostics.
        raise RuntimeError("GitHub request failed; state is unknown")
    return json.loads(result.stdout)


def observe(row):
    repo = row["repo"]
    try:
        metadata = gh(f"repos/{repo}")
        from urllib.parse import quote
        head = gh(f"repos/{repo}/git/ref/heads/{quote(metadata['default_branch'], safe='')}")
        return repo, {"pushed_at": metadata["pushed_at"], "head": head["object"]["sha"]}
    except (RuntimeError, KeyError, subprocess.TimeoutExpired):
        return repo, {"error": "metadata unavailable; not completed"}


def plan(master, queue, observations, now, quota_exhausted=False):
    if quota_exhausted:
        return {"action": "quota_exhausted", "repository": None}
    days = master["policy"]["recent_push_days"]
    cutoff = now - timedelta(days=days)
    registered = {p["repo"] for p in master["projects"] if p.get("enabled")}
    candidates, unknown, incomplete, busy = [], [], [], []
    for row in queue["repositories"]:
        repo = row["repo"]
        if repo not in registered:
            continue
        try:
            # This date is verified non-controller activity, never checkpoint time.
            if timestamp(row["qualifying_activity_at"]) < cutoff:
                continue
        except (KeyError, ValueError, TypeError):
            unknown.append(repo)
            continue
        obs = observations.get(repo, {})
        if obs.get("error") or not obs.get("head") or not obs.get("pushed_at"):
            unknown.append(repo)
            continue
        try:
            pushed = timestamp(obs["pushed_at"])
        except (ValueError, TypeError):
            unknown.append(repo)
            continue
        if pushed < cutoff:
            continue
        changed = obs["head"] != row.get("last_reviewed_head")
        # Completed at an older head must be reviewed too.
        if row.get("status") == "completed" and not changed:
            continue
        incomplete.append(repo)
        lease = row.get("lease") or {}
        try:
            if lease and timestamp(lease["expires_at"]) > now:
                busy.append(repo)
                continue
        except (KeyError, ValueError, TypeError):
            unknown.append(repo)
            continue
        if changed:
            priority, action, reason = 0, "review", "github_head_changed"
        elif row.get("status") in {"in_progress", "ready"}:
            priority, action, reason = 1, "work", "unfinished_next"
        else:
            try:
                due = timestamp(row.get("review_after", "1970-01-01T00:00:00Z"))
                last = timestamp(row.get("last_review_at", "1970-01-01T00:00:00Z"))
            except (ValueError, TypeError):
                unknown.append(repo)
                continue
            if due > now:
                continue
            priority, action, reason = 2, "review", "blocked_retry_due"
        # Changed heads/work follow pushed_at; retry rounds cannot starve older rows.
        order = last.timestamp() if priority == 2 else -pushed.timestamp()
        candidates.append((priority, order, repo, action, reason, obs["head"]))
    if candidates:
        _, _, repo, action, reason, head = min(candidates)
        return dict(action=action, repository=repo, reason=reason, observed_head=head,
                    unknown_repositories=unknown, busy_repositories=busy)
    return dict(action="unknown" if unknown else "waiting" if incomplete else "completed",
                repository=None, unknown_repositories=unknown, busy_repositories=busy)


def claim(result, master, queue, owner, now, api=gh):
    if result["action"] not in {"review", "work"}:
        raise RuntimeError("No candidate to claim")
    path = f"repos/{master['controller']}/contents/ACTIVE_QUEUE.yaml"
    remote = api(path)
    remote_queue = yaml.safe_load(base64.b64decode(remote["content"]))
    if remote_queue != queue:
        raise RuntimeError("Queue changed; reload GitHub and replan")
    row = next(r for r in remote_queue["repositories"] if r["repo"] == result["repository"])
    # Re-evaluate lease even if the caller passes a stale selection.
    if row.get("lease"):
        if timestamp(row["lease"]["expires_at"]) > now:
            raise RuntimeError("Repository already leased")
    row["lease"] = {"owner": owner, "expires_at": (now + timedelta(
        minutes=queue["policy"]["lease_minutes"])).isoformat()}
    remote_queue["next_repository"] = row["repo"]
    payload = {"message": f"Claim controller {result['action']} for {row['repo']}",
               "sha": remote["sha"], "content": base64.b64encode(yaml.safe_dump(
                   remote_queue, allow_unicode=True, sort_keys=False).encode()).decode()}
    # GitHub's file SHA compare-and-swap rejects concurrent claims (409/422).
    response = api(path, "PUT", payload)
    return response["commit"]["sha"]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", type=Path, help="Offline metadata JSON; no GitHub reads")
    parser.add_argument("--quota-exhausted", action="store_true")
    parser.add_argument("--claim", metavar="UNIQUE_RUN_ID")
    args = parser.parse_args()
    master = yaml.safe_load((ROOT / "MASTER_STATE.yaml").read_text())
    queue = yaml.safe_load((ROOT / "ACTIVE_QUEUE.yaml").read_text())
    now = datetime.now(timezone.utc)
    if args.quota_exhausted:
        print(json.dumps(plan(master, queue, {}, now, True)))
        return
    if args.snapshot:
        if args.claim:
            parser.error("Offline snapshots cannot acquire a live lease")
        values = json.loads(args.snapshot.read_text())
        observations = {r["repo"]: r for r in values} if isinstance(values, list) else values
    else:
        registered = {p["repo"] for p in master["projects"] if p.get("enabled")}
        rows = [r for r in queue["repositories"] if r["repo"] in registered
                and timestamp(r["qualifying_activity_at"]) >= now - timedelta(
                    days=master["policy"]["recent_push_days"])]
        with ThreadPoolExecutor(max_workers=4) as pool:
            observations = dict(pool.map(observe, rows))
    result = plan(master, queue, observations, now)
    if args.claim:
        result["claim_commit"] = claim(result, master, queue, args.claim, now)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, subprocess.TimeoutExpired) as error:
        print(json.dumps({"action": "unknown", "error": str(error)}))
        sys.exit(1)
