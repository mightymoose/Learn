#!/usr/bin/env python3
"""Structural checks on every page in the repo.

Scans index.html plus every <subject>/lessons/*.html and <subject>/reference/*.html:

  - tags are balanced
  - every relative href/src resolves to a file that exists
  - no absolute-path href/src, which would 404 under a GitHub Pages subpath
  - inline SVG is well formed
  - each multiple-choice drill has exactly one correct answer
  - each ordering drill has positions 1..n with no gaps
  - multiple-choice answers all have the same word count, so length is not a tell

Run: python3 tools/check-pages.py
"""

import os
import re
import sys
from html.parser import HTMLParser
from xml.etree import ElementTree as ET

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
VOID = {"meta", "link", "br", "hr", "img", "input", "source", "path", "line",
        "use", "circle", "rect", "polygon", "ellipse", "stop", "col"}
SKIP_DIRS = {".git", ".claude", "node_modules", "tools"}


class Balance(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.err = []

    def handle_starttag(self, tag, attrs):
        if tag not in VOID:
            self.stack.append((tag, self.getpos()[0]))

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if not self.stack:
            self.err.append("stray </%s> line %d" % (tag, self.getpos()[0]))
            return
        top, line = self.stack[-1]
        if top != tag:
            self.err.append("expected </%s> (opened line %d), got </%s> line %d"
                            % (top, line, tag, self.getpos()[0]))
        else:
            self.stack.pop()


def pages():
    found = []
    if os.path.exists(os.path.join(ROOT, "index.html")):
        found.append("index.html")
    for sub in sorted(os.listdir(ROOT)):
        p = os.path.join(ROOT, sub)
        if not os.path.isdir(p) or sub in SKIP_DIRS or sub.startswith("."):
            continue
        for kind in ("lessons", "reference"):
            d = os.path.join(p, kind)
            if not os.path.isdir(d):
                continue
            for f in sorted(os.listdir(d)):
                if f.endswith(".html"):
                    found.append("%s/%s/%s" % (sub, kind, f))
    return found


def strip_tags(s):
    return " ".join(re.sub(r"<[^>]+>", "", s).split())


def check(rel, problems):
    src = open(os.path.join(ROOT, rel), encoding="utf-8").read()

    b = Balance()
    b.feed(src)
    for e in b.err:
        problems.append("%s: %s" % (rel, e))
    for tag, line in b.stack:
        problems.append("%s: <%s> opened line %d never closed" % (rel, tag, line))

    # Link and markup scans ignore script and style bodies. A JS string like
    # '<a href="' + path + '"' is not a link, and matching it reports a phantom.
    # Keep the opening tag so <script src="..."> is still verified, drop only the body.
    markup = re.sub(r"(<(script|style)\b[^>]*>)[\s\S]*?(</\2>)", r"\1\3", src, flags=re.I)

    base = os.path.dirname(rel)
    for attr, href in re.findall(r'(href|src)="([^"#]+)"', markup):
        if href.startswith(("http://", "https://", "mailto:", "data:")):
            continue
        if href.startswith("/"):
            problems.append("%s: absolute path %s will 404 on a Pages subpath" % (rel, href))
            continue
        target = os.path.normpath(os.path.join(ROOT, base, href))
        if not os.path.exists(target):
            problems.append("%s: %s -> missing %s" % (rel, href, os.path.relpath(target, ROOT)))

    for i, m in enumerate(re.finditer(r"<svg[\s\S]*?</svg>", markup), 1):
        frag = re.sub(r"&(?!(amp|lt|gt|quot|apos);)\w+;", "X", m.group(0))
        try:
            ET.fromstring(frag)
        except ET.ParseError as e:
            problems.append("%s: svg #%d is malformed (%s)" % (rel, i, e))

    for i, m in enumerate(re.finditer(r'data-drill="choice"([\s\S]*?)</div>', markup), 1):
        blk = m.group(1)
        buttons = re.findall(r'<button class="opt"([^>]*)>([\s\S]*?)</button>', blk)
        correct = sum(1 for attrs, _ in buttons if 'data-correct="true"' in attrs)
        if correct != 1:
            problems.append("%s: choice drill #%d has %d correct answers, want 1"
                            % (rel, i, correct))
        if any('data-why' not in attrs for attrs, _ in buttons):
            problems.append("%s: choice drill #%d has an option with no data-why feedback" % (rel, i))
        counts = {len(strip_tags(label).split()) for _, label in buttons}
        if len(counts) > 1:
            problems.append("%s: choice drill #%d answers differ in length %s, which is a tell"
                            % (rel, i, sorted(counts)))

    for i, m in enumerate(re.finditer(r'data-drill="order"([\s\S]*?)</div>', markup), 1):
        pos = sorted(int(x) for x in re.findall(r'data-pos="(\d+)"', m.group(1)))
        if pos != list(range(1, len(pos) + 1)):
            problems.append("%s: order drill #%d positions are %s, want 1..n" % (rel, i, pos))


def main():
    found = pages()
    problems = []
    for rel in found:
        check(rel, problems)

    print("Checked %d page(s):" % len(found))
    for rel in found:
        print("   %s" % rel)

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
