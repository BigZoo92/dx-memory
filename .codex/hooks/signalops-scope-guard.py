#!/usr/bin/env python3
"""SignalOps scope guard (PreToolUse).

Keeps each variant's agent inside its own lane. It is intentionally light: it only
inspects the tool input, classifies the paths/commands it would touch, and blocks
*evident* cross-variant edits. It never runs tests, never touches the network.

Decision model
--------------
- Active scope is read from $SIGNALOPS_SCOPE (flow|overfit|friction) or inferred
  from the working directory.
- A single action that touches more than one variant is blocked (evident mix).
- If an active scope is known, touching another variant is blocked.
- Touching docs/product or maquettes is blocked unless $SIGNALOPS_ALLOW_PRODUCT is set.
- If nothing SignalOps-related is touched, the guard stays silent and allows.

Exit codes: 2 = block, 0 = allow. Any parsing problem -> allow (fail open, log to stderr).
"""

import json
import os
import re
import sys

# A path fragment can appear at string start, after a path separator, or after a
# non-path character (space, quote, =, ...) inside a shell command. So the leading
# boundary is "start OR any char that cannot be part of a path name".
B = r"(?:^|[^A-Za-z0-9_.-])"
E = r"(?:/|$)"

# variant -> list of path fragments (matched anywhere in a forward-slash string)
SCOPES = {
    "flow": [
        B + r"apps/flow-app" + E,
        B + r"packages/flow" + E,
        B + r"docs/audit/flow" + E,
    ],
    "overfit": [
        B + r"apps/overfit-web" + E,
        B + r"apps/overfit-api" + E,
        B + r"packages/overfit" + E,
        B + r"docs/audit/overfit" + E,
    ],
    "friction": [
        B + r"apps/friction-web" + E,
        B + r"apps/friction-api" + E,
        B + r"packages/friction" + E,
        B + r"docs/audit/friction" + E,
    ],
}

PROTECTED = {
    "docs/product": [B + r"docs/product" + E],
    "maquettes": [B + r"maquettes" + E],
}

SCOPE_RE = {k: [re.compile(p) for p in v] for k, v in SCOPES.items()}
PROTECTED_RE = {k: [re.compile(p) for p in v] for k, v in PROTECTED.items()}

# diff / apply_patch header forms we know how to read a path out of
PATCH_PATH_RE = re.compile(
    r"^(?:\*\*\* (?:Add|Update|Delete) File: |\+\+\+ b/|--- a/|diff --git a/)(\S+)",
    re.MULTILINE,
)


def log(msg):
    sys.stderr.write("[signalops-scope-guard] " + msg + "\n")


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


def collect(tool_input):
    """Return (explicit_paths, free_text) extracted from the tool input."""
    paths = []
    texts = []
    if not isinstance(tool_input, dict):
        return paths, texts

    for key in ("file_path", "path", "notebook_path"):
        val = tool_input.get(key)
        if isinstance(val, str):
            paths.append(val)

    val = tool_input.get("file_paths")
    if isinstance(val, list):
        paths.extend([x for x in val if isinstance(x, str)])

    cmd = tool_input.get("command")
    if isinstance(cmd, str):
        texts.append(cmd)

    for key in ("patch", "input", "diff", "changes", "content_patch"):
        val = tool_input.get(key)
        if isinstance(val, str):
            paths.extend(PATCH_PATH_RE.findall(val))

    return paths, texts


def classify(value):
    """Return ('scope', name), ('protected', name) or None for a single string."""
    norm = value.replace("\\", "/")
    for name, patterns in SCOPE_RE.items():
        if any(p.search(norm) for p in patterns):
            return ("scope", name)
    for name, patterns in PROTECTED_RE.items():
        if any(p.search(norm) for p in patterns):
            return ("protected", name)
    return None


def scan_text(text):
    """A command/diff blob can mention several areas; return (variants, protected)."""
    norm = text.replace("\\", "/")
    variants = set()
    protected = set()
    for name, patterns in SCOPE_RE.items():
        if any(p.search(norm) for p in patterns):
            variants.add(name)
    for name, patterns in PROTECTED_RE.items():
        if any(p.search(norm) for p in patterns):
            protected.add(name)
    return variants, protected


def active_scope(cwd):
    env = os.environ.get("SIGNALOPS_SCOPE", "").strip().lower()
    if env in SCOPES:
        return env
    if cwd:
        hit = classify(cwd)
        if hit and hit[0] == "scope":
            return hit[1]
    # fall back to the real working directory
    hit = classify(os.getcwd())
    if hit and hit[0] == "scope":
        return hit[1]
    return None


def main():
    data = read_input()
    tool_name = data.get("tool_name", "")
    tool_input = data.get("tool_input", {}) or {}
    cwd = data.get("cwd", "") or ""

    paths, texts = collect(tool_input)

    variants = set()
    protected = set()
    for p in paths:
        hit = classify(p)
        if hit is None:
            continue
        if hit[0] == "scope":
            variants.add(hit[1])
        else:
            protected.add(hit[1])
    for t in texts:
        v, pr = scan_text(t)
        variants |= v
        protected |= pr

    # Nothing SignalOps-related -> stay out of the way.
    if not variants and not protected:
        sys.exit(0)

    active = active_scope(cwd)
    allow_product = truthy(os.environ.get("SIGNALOPS_ALLOW_PRODUCT"))

    reasons = []

    if len(variants) > 1:
        reasons.append(
            "this single %s action touches multiple variants (%s); keep edits to one variant."
            % (tool_name or "tool", ", ".join(sorted(variants)))
        )

    if active and variants:
        off = sorted(v for v in variants if v != active)
        if off:
            reasons.append(
                "active scope is '%s' but this action touches '%s'. Run the agent from the "
                "matching folder, or set SIGNALOPS_SCOPE, before editing another variant."
                % (active, ", ".join(off))
            )

    if protected and not allow_product:
        reasons.append(
            "this action touches protected area(s): %s. These are frozen in this pass; set "
            "SIGNALOPS_ALLOW_PRODUCT=1 only if the user explicitly asked for it."
            % ", ".join(sorted(protected))
        )

    if reasons:
        log("BLOCKED " + (tool_name or "tool"))
        for r in reasons:
            log("- " + r)
        # stderr on exit 2 is surfaced back to the agent.
        sys.stderr.write(
            "SignalOps scope guard blocked this action:\n- " + "\n- ".join(reasons) + "\n"
        )
        sys.exit(2)

    sys.exit(0)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # never crash the tool call
        log("internal error, allowing: %r" % (exc,))
        sys.exit(0)
