#!/usr/bin/env python3
"""SignalOps post-edit dispatch (PostToolUse).

After a file edit, run the *light* architecture checks for the variant that was
touched. Nothing else. It never runs the full test suite.

- Flow code touched  -> `pnpm audit:flow:boundaries` + `pnpm audit:flow:cycles`.
- Overfit touched    -> report "Overfit checks not configured yet" and stop.
- Nothing relevant   -> silent, allow.

Exit codes: 0 = ok / informational. 2 only when a Flow audit reports a real
boundary or cycle violation, so the agent is told to fix it. Set
$SIGNALOPS_SKIP_AUDIT=1 to disable the audit run entirely.
"""

import json
import os
import re
import subprocess
import sys

# Leading boundary: start, a path separator, or a non-path char (covers in-command paths).
B = r"(?:^|[^A-Za-z0-9_.-])"
FLOW_CODE_RE = [
    re.compile(B + r"apps/flow-app/src/.*\.(?:ts|tsx|cjs|mjs|js|jsx)$"),
    re.compile(B + r"packages/flow/[^/]+/src/.*\.(?:ts|tsx|cjs|mjs|js|jsx)$"),
]
FLOW_ANY_RE = re.compile(B + r"(?:apps/flow-app|packages/flow|docs/audit/flow)(?:/|$)")
OVERFIT_ANY_RE = re.compile(
    B + r"(?:apps/overfit-web|apps/overfit-api|packages/overfit|docs/audit/overfit)(?:/|$)"
)
PATCH_PATH_RE = re.compile(
    r"^(?:\*\*\* (?:Add|Update|Delete) File: |\+\+\+ b/|--- a/|diff --git a/)(\S+)",
    re.MULTILINE,
)

AUDITS = [
    ("boundaries", ["pnpm", "audit:flow:boundaries"]),
    ("cycles", ["pnpm", "audit:flow:cycles"]),
]


def log(msg):
    sys.stderr.write("[signalops-post-edit] " + msg + "\n")


def out(msg):
    sys.stdout.write("[signalops-post-edit] " + msg + "\n")


def read_input():
    raw = sys.stdin.read()
    if not raw.strip():
        return {}
    try:
        data = json.loads(raw)
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def truthy(value):
    return str(value or "").strip().lower() in ("1", "true", "yes", "on")


def collect_paths(tool_input):
    paths = []
    if not isinstance(tool_input, dict):
        return paths
    for key in ("file_path", "path", "notebook_path"):
        val = tool_input.get(key)
        if isinstance(val, str):
            paths.append(val)
    val = tool_input.get("file_paths")
    if isinstance(val, list):
        paths.extend([x for x in val if isinstance(x, str)])
    cmd = tool_input.get("command")
    if isinstance(cmd, str):
        paths.append(cmd)
    for key in ("patch", "input", "diff", "changes", "content_patch"):
        val = tool_input.get(key)
        if isinstance(val, str):
            paths.extend(PATCH_PATH_RE.findall(val))
    return [p.replace("\\", "/") for p in paths]


def repo_root():
    try:
        res = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            capture_output=True,
            text=True,
            timeout=5,
        )
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip()
    except Exception:
        pass
    # fall back: two levels up from this hook file (.../.claude/hooks/ or .../.codex/hooks/)
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def run_audit(label, cmd, cwd):
    try:
        res = subprocess.run(
            cmd, cwd=cwd, capture_output=True, text=True, timeout=120
        )
    except FileNotFoundError:
        out("pnpm not found, skipping flow:%s." % label)
        return None
    except subprocess.TimeoutExpired:
        out("flow:%s timed out, skipping." % label)
        return None
    except Exception as exc:
        out("flow:%s could not run (%r), skipping." % (label, exc))
        return None

    if res.returncode == 0:
        out("flow:%s OK." % label)
        return True

    out("flow:%s FAILED (exit %d)." % (label, res.returncode))
    tail = (res.stdout or "") + (res.stderr or "")
    tail = "\n".join(tail.strip().splitlines()[-25:])
    if tail:
        sys.stderr.write(tail + "\n")
    return False


def main():
    data = read_input()
    tool_input = data.get("tool_input", {}) or {}
    paths = collect_paths(tool_input)
    if not paths:
        sys.exit(0)

    flow_code = any(rx.search(p) for p in paths for rx in FLOW_CODE_RE)
    flow_any = any(FLOW_ANY_RE.search(p) for p in paths)
    overfit_any = any(OVERFIT_ANY_RE.search(p) for p in paths)

    if not flow_any and not overfit_any:
        sys.exit(0)

    if overfit_any:
        out("Overfit files touched. Overfit checks not configured yet.")

    if not flow_code:
        # Flow touched but no Flow source code (e.g. docs/audit/flow) -> nothing to audit.
        sys.exit(0)

    if truthy(os.environ.get("SIGNALOPS_SKIP_AUDIT")):
        out("SIGNALOPS_SKIP_AUDIT set, skipping flow audits.")
        sys.exit(0)

    root = repo_root()
    out("Flow code touched. Running light architecture audits in %s" % root)
    failed = False
    for label, cmd in AUDITS:
        result = run_audit(label, cmd, root)
        if result is False:
            failed = True

    sys.exit(2 if failed else 0)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        log("internal error, allowing: %r" % (exc,))
        sys.exit(0)
