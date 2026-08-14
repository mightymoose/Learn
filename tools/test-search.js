/* Test the index search against the real generated search-index.js.
   Run: node tools/test-search.js */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.dirname(__dirname);
const { filterEntries, groupBySubject } = require(path.join(ROOT, "search-filter.js"));

// search-index.js assigns to window, so give it one.
const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(ROOT, "search-index.js"), "utf8"), sandbox);
const entries = sandbox.window.LEARN_INDEX;

let failed = 0;
function check(name, cond, extra) {
  if (cond) console.log("  pass  " + name);
  else { console.log("  FAIL  " + name + (extra !== undefined ? "  [" + extra + "]" : "")); failed++; }
}

console.log("Loaded " + entries.length + " entries from the real index.\n");

console.log("Shape:");
check("index is a non-empty array", Array.isArray(entries) && entries.length > 0);
check("every entry has title, path, subject, type",
  entries.every(e => e.title && e.path && e.subject && e.type));
check("every path is relative, not absolute",
  entries.every(e => !e.path.startsWith("/") && !/^https?:/.test(e.path)),
  entries.map(e => e.path).join(", "));
check("every path exists on disk",
  entries.every(e => fs.existsSync(path.join(ROOT, e.path))));
check("type is only lesson or reference",
  entries.every(e => ["lesson", "reference"].includes(e.type)));

console.log("\nEmpty query:");
check("returns everything", filterEntries(entries, "", "all").length === entries.length);
check("whitespace-only returns everything", filterEntries(entries, "   ", "all").length === entries.length);
check("undefined query returns everything", filterEntries(entries, undefined, "all").length === entries.length);

console.log("\nMatching:");
const monoid = filterEntries(entries, "monoid", "all");
check("finds pages tagged monoid", monoid.length >= 2, monoid.length);
check("case-insensitive", filterEntries(entries, "MONOID", "all").length === monoid.length);
check("matches a tag not in the title",
  filterEntries(entries, "almost all", "all").length >= 1);
check("matches the section field",
  filterEntries(entries, "§1", "all").length >= 1);
check("matches the source field",
  filterEntries(entries, "lang", "all").length === entries.length);
check("no match returns empty",
  filterEntries(entries, "zzzznotathing", "all").length === 0);

console.log("\nMulti-term is AND, not OR:");
const both = filterEntries(entries, "monoid powers", "all");
const justPowers = filterEntries(entries, "powers", "all");
check("two terms narrow the result", both.length <= justPowers.length, both.length + " <= " + justPowers.length);
check("one impossible term kills the match",
  filterEntries(entries, "monoid zzzznotathing", "all").length === 0);

console.log("\nType filter:");
const lessons = filterEntries(entries, "", "lesson");
const refs = filterEntries(entries, "", "reference");
check("lesson filter returns only lessons", lessons.every(e => e.type === "lesson") && lessons.length > 0);
check("reference filter returns only reference", refs.every(e => e.type === "reference") && refs.length > 0);
check("lesson + reference accounts for everything", lessons.length + refs.length === entries.length);
check("type and query combine",
  filterEntries(entries, "monoid", "reference").every(e => e.type === "reference"));

console.log("\nAhead-of-sequence flag:");
const ahead = entries.filter(e => e.status === "ahead-of-sequence");
check("the universal properties card is flagged", ahead.length === 1 && /universal/.test(ahead[0].path), ahead.length);
check("the lesson is not flagged", entries.filter(e => e.type === "lesson").every(e => e.status === "current"));

console.log("\nGrouping:");
const groups = groupBySubject(entries);
check("groups by subject", groups.length >= 1 && groups[0].subject === "Algebra");
check("grouping preserves the entry count",
  groups.reduce((n, g) => n + g.items.length, 0) === entries.length);
check("empty input groups to nothing", groupBySubject([]).length === 0);

console.log("\n" + (failed ? "RESULT: FAIL (" + failed + ")" : "RESULT: PASS"));
process.exit(failed ? 1 : 0);
