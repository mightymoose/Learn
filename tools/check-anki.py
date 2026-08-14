#!/usr/bin/env python3
"""Validate the Anki import decks under <subject>/anki/*.tsv.

A malformed deck fails at import time with a message that does not say which
row is wrong, so check it here instead:

  - the header directives Anki needs are present and well formed
  - the deck name has no HTML entities, which Anki would not decode
  - every row has exactly the declared number of columns
  - no field is empty
  - no duplicate question, which would create sibling cards you cannot tell apart
  - HTML tags inside fields are balanced
  - every character entity is one Anki will render

Run: python3 tools/check-anki.py
"""

import os
import re
import sys
from collections import Counter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP = {".git", ".claude", "node_modules", "tools"}
REQUIRED = ["separator", "html", "notetype", "deck"]
VOID = {"br", "hr", "img"}


def decks():
    out = []
    for sub in sorted(os.listdir(ROOT)):
        d = os.path.join(ROOT, sub, "anki")
        if sub in SKIP or sub.startswith(".") or not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.endswith(".tsv"):
                out.append("%s/anki/%s" % (sub, f))
    return out


def check_html(field, where, problems):
    stack = []
    for m in re.finditer(r"<(/?)([a-zA-Z0-9]+)[^>]*?(/?)>", field):
        closing, tag, selfclose = m.group(1), m.group(2).lower(), m.group(3)
        if tag in VOID or selfclose:
            continue
        if closing:
            if not stack or stack[-1] != tag:
                problems.append("%s: </%s> does not match %s"
                                % (where, tag, "<" + stack[-1] + ">" if stack else "an open tag"))
                return
            stack.pop()
        else:
            stack.append(tag)
    if stack:
        problems.append("%s: unclosed <%s>" % (where, stack[-1]))

    for ent in re.findall(r"&([a-zA-Z]+|#\d+);", field):
        known = {"amp", "lt", "gt", "quot", "apos", "nbsp", "times", "rarr", "prime",
                 "prod", "sum", "isin", "ne", "ge", "le", "minus", "middot", "hellip",
                 "sect", "ndash", "mdash", "nu", "mu", "psi", "phi", "tau", "pi",
                 "Copf", "Zopf", "compfn", "thinsp", "ldquo", "rdquo", "exist", "sub", "sup"}
        if not ent.startswith("#") and ent not in known:
            problems.append("%s: unrecognised entity &%s;" % (where, ent))


def main():
    found = decks()
    problems = []
    total = 0

    if not found:
        print("No decks found under */anki/.")
        return 0

    for rel in found:
        lines = open(os.path.join(ROOT, rel), encoding="utf-8").read().split("\n")
        directives = {}
        rows = []
        for i, line in enumerate(lines, 1):
            if not line.strip():
                continue
            if line.startswith("#"):
                if ":" not in line:
                    problems.append("%s line %d: malformed directive %r" % (rel, i, line))
                    continue
                k, v = line[1:].split(":", 1)
                directives[k.strip()] = v.strip()
            else:
                rows.append((i, line))

        for key in REQUIRED:
            if key not in directives:
                problems.append("%s: missing #%s directive" % (rel, key))

        if directives.get("separator") != "tab":
            problems.append("%s: separator is %r, this checker assumes tab"
                            % (rel, directives.get("separator")))

        deck_name = directives.get("deck", "")
        if re.search(r"&[a-zA-Z#0-9]+;", deck_name):
            problems.append("%s: deck name %r contains an HTML entity, which Anki will not decode"
                            % (rel, deck_name))

        tags_col = directives.get("tags column")
        want_cols = int(tags_col) if tags_col and tags_col.isdigit() else 2

        seen = {}
        tag_counts = Counter()
        for i, line in rows:
            fields = line.split("\t")
            if len(fields) != want_cols:
                problems.append("%s line %d: %d columns, want %d" % (rel, i, len(fields), want_cols))
                continue
            for n, f in enumerate(fields[:2], 1):
                if not f.strip():
                    problems.append("%s line %d: field %d is empty" % (rel, i, n))
                check_html(f, "%s line %d field %d" % (rel, i, n), problems)
            front = fields[0]
            if front in seen:
                problems.append("%s line %d: duplicate question, first seen line %d" % (rel, i, seen[front]))
            seen[front] = i
            if want_cols >= 3:
                tag_counts.update(fields[2].split())

        total += len(rows)
        print("%s" % rel)
        print("   deck: %s" % (deck_name or "(none)"))
        print("   %d card(s)" % len(rows))
        if tag_counts:
            shown = ", ".join("%s x%d" % (t, n) for t, n in sorted(tag_counts.items()))
            print("   tags: %s" % shown)

    print("\n%d card(s) across %d deck(s)." % (total, len(found)))

    if problems:
        print("\n%d problem(s):" % len(problems))
        for p in problems:
            print("  - %s" % p)
        print("\nRESULT: FAIL")
        return 1
    print("\nRESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
