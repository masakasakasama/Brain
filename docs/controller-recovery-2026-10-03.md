# Controller recovery

## Root cause

The controller treated `next_repository: null` plus five blocked queue rows as a
permanent stop, never checking GitHub metadata or changing runtime capability.
The queue used seven days while MASTER used thirty, and removed unfinished
registered workers. Repeated runs therefore missed actual newer worker commits.

## Changes

- Match MASTER's thirty-day policy and retain thirteen eligible unfinished workers.
  Store verified non-controller activity separately from controller checkpoints.
  mf-dashboard's September 3 activity is outside the current thirty-day window;
  its October 2 controller changes do not extend that window.
- Read-only GitHub metadata selection: changed heads first, unfinished work next,
  and oldest due blocked review last. Null pointers cannot suppress rechecks.
- Six-hour cooldown for unchanged blockers; no repeated unchanged notifications.
- GitHub Contents file-SHA compare-and-swap lease before worker editing. A lost
  claim is a stop, and unknown credentials/status can never count as completion.
- Preserve exactly one existing automation. No quota recovery inference.

## Verification

11 selector tests passed, including changed blocked head, pushed order,
retry fairness/cooldown, controller-only stale activity, registry filtering,
unknown/completion, usage limit, lease expiry, file CAS and stale queue rejection.
Offline real metadata diagnosed Daily_check at a275469 as changed, without sending
messages or changing any worker. Live lease/probe/publication results follow in
CONTROLLER_CHECKPOINT.md. Credentials/device probes remain separate from selector
unit tests; this change does not manufacture missing production/device evidence.
