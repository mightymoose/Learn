#!/usr/bin/env python3
"""Build search-index.js from the lesson and reference pages in this repo.

Scans every <subject>/lessons/*.html and <subject>/reference/*.html, reads the
learn:* meta tags, and writes a single JS file that index.html loads.

Run it after adding or renaming a page:

    python3 tools/build-index.py

No dependencies. Standard library only.
"""

import html
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "search-index.js")

# Directories that hold pages, and the type each implies when meta is missing.
PAGE_DIRS = {"lessons": "lesson", "reference": "reference"}

# Directories that are never subjects.
SKIP = {".git", ".claude", "tools", "node_modules", "assets"}


def text_of(pattern, source, default=""):
    m = re.search(pattern, source, re.S | re.I)
    if not m:
        return default
    raw = re.sub(r"<[^>]+>", "", m.group(1))
    return html.unescape(" ".join(raw.split()))


def meta(name, source, default=""):
    m = re.search(
        r'<meta\s+name="%s"\s+content="([^"]*)"' % re.escape(name), source, re.I
    )
    return html.unescape(m.group(1).strip()) if m else default


def deck_entry(subject_dir, path, rel):
    """Describe an Anki deck from the file itself. A .tsv carries no meta tags,
    so the title comes from its #deck directive and the summary from its rows."""
    directives = {}
    rows = []
    for line in open(path, encoding="utf-8").read().split("\n"):
        if not line.strip():
            continue
        if line.startswith("#"):
            if ":" in line:
                k, v = line[1:].split(":", 1)
                directives[k.strip()] = v.strip()
        else:
            rows.append(line)

    deck_name = directives.get("deck", "")
    leaf = deck_name.split("::")[-1] if deck_name else os.path.basename(path)

    tags = set()
    tags_col = directives.get("tags column")
    if tags_col and tags_col.isdigit():
        i = int(tags_col) - 1
        for r in rows:
            fields = r.split("\t")
            if len(fields) > i:
                tags.update(fields[i].split())

    kinds = sorted(t.split("::")[-1] for t in tags if t.startswith("type::"))
    covering = ", ".join(kinds) if kinds else "assorted cards"

    return {
        "title": "Anki deck · " + leaf,
        "path": rel,
        "subject": subject_dir.title(),
        "type": "deck",
        "source": "",
        "section": leaf,
        "order": "9998",
        "status": "current",
        "kicker": deck_name,
        "summary": "%d cards to import into Anki, covering %s." % (len(rows), covering),
        "tags": sorted(t.replace("::", " ") for t in tags),
    }


def collect():
    entries = []
    problems = []

    for subject_dir in sorted(os.listdir(ROOT)):
        subject_path = os.path.join(ROOT, subject_dir)
        if not os.path.isdir(subject_path) or subject_dir in SKIP:
            continue
        if subject_dir.startswith("."):
            continue

        for page_dir, implied_type in PAGE_DIRS.items():
            d = os.path.join(subject_path, page_dir)
            if not os.path.isdir(d):
                continue

            for fname in sorted(os.listdir(d)):
                if not fname.endswith(".html"):
                    continue
                path = os.path.join(d, fname)
                rel = os.path.relpath(path, ROOT).replace(os.sep, "/")
                src = open(path, encoding="utf-8").read()

                title = text_of(r"<title>(.*?)</title>", src, fname)
                kicker = text_of(r'class="kicker"[^>]*>(.*?)</p>', src)
                summary = text_of(r'class="standfirst"[^>]*>(.*?)</p>', src)
                tags = [t.strip() for t in meta("learn:tags", src).split(",") if t.strip()]

                entry = {
                    "title": title,
                    "path": rel,
                    "subject": meta("learn:subject", src, subject_dir.title()),
                    "type": meta("learn:type", src, implied_type),
                    "source": meta("learn:source", src),
                    "section": meta("learn:section", src),
                    "order": meta("learn:order", src, "9999"),
                    "status": meta("learn:status", src, "current"),
                    "kicker": kicker,
                    "summary": summary,
                    "tags": tags,
                }

                if not meta("learn:subject", src):
                    problems.append("%s has no learn:subject meta" % rel)
                if not summary:
                    problems.append("%s has no .standfirst summary" % rel)

                entries.append(entry)

        anki_dir = os.path.join(subject_path, "anki")
        if os.path.isdir(anki_dir):
            for fname in sorted(os.listdir(anki_dir)):
                if not fname.endswith(".tsv"):
                    continue
                p = os.path.join(anki_dir, fname)
                rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
                entries.append(deck_entry(subject_dir, p, rel))

    def sort_key(e):
        try:
            primary = float(e["order"])
        except ValueError:
            primary = 9999.0
        # Lessons sort before reference cards covering the same section.
        rank = {"lesson": 0, "reference": 1, "deck": 2}.get(e["type"], 3)
        return (e["subject"].lower(), primary, rank)

    entries.sort(key=sort_key)
    return entries, problems


def main():
    entries, problems = collect()

    banner = (
        "/* Generated by tools/build-index.py. Do not edit by hand.\n"
        "   Regenerate after adding or renaming a page:\n"
        "       python3 tools/build-index.py\n"
        "   %d page(s) indexed. */\n"
    ) % len(entries)

    payload = json.dumps(entries, indent=2, ensure_ascii=False)
    open(OUT, "w", encoding="utf-8").write(
        banner + "window.LEARN_INDEX = " + payload + ";\n"
    )

    subjects = sorted({e["subject"] for e in entries})
    print("Wrote %s" % os.path.relpath(OUT, ROOT))
    print("  %d pages across %d subject(s): %s" % (len(entries), len(subjects), ", ".join(subjects)))
    for e in entries:
        flag = "  [%s]" % e["status"] if e["status"] != "current" else ""
        print("   %-10s %-10s %s%s" % (e["subject"], e["type"], e["path"], flag))

    if problems:
        print("\nWarnings:")
        for p in problems:
            print("  - %s" % p)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
