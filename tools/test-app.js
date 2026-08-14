/* Execute the real inline app script from index.html against the real
   search-index.js, using the real htm plus a mini React that walks function
   components. Catches htm template errors and render regressions that a
   markup checker cannot see.

   Run: node tools/test-app.js */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.dirname(__dirname);

let failed = 0;
function check(name, cond, extra) {
  if (cond) console.log("  pass  " + name);
  else { console.log("  FAIL  " + name + (extra !== undefined ? "  [" + extra + "]" : "")); failed++; }
}

const indexHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

console.log("Extracting the app:");
const scripts = [...indexHtml.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
check("index.html has exactly one inline script", scripts.length === 1, scripts.length);
const appSrc = scripts[scripts.length - 1];
check("it is valid JavaScript", (() => {
  try { new vm.Script(appSrc); return true; } catch (e) { console.log("      " + e.message); return false; }
})());

/* ---------- mini React: enough to walk the tree ---------- */

const hookState = [];
let hookIndex = 0;

const React = {
  createElement(type, props, ...children) {
    return {
      type,
      props: props || {},
      children: children.flat(Infinity).filter(c => c !== null && c !== undefined && c !== false),
    };
  },
  useState(init) {
    const i = hookIndex++;
    if (!(i in hookState)) hookState[i] = typeof init === "function" ? init() : init;
    return [hookState[i], v => { hookState[i] = v; }];
  },
  useEffect() {},
  useMemo(fn) { return fn(); },
  useRef(init) { return { current: init }; },
};

function render(node, depth = 0) {
  if (depth > 60) throw new Error("render depth exceeded");
  if (node === null || node === undefined || node === false) return [];
  if (typeof node === "string" || typeof node === "number") return [String(node)];
  if (Array.isArray(node)) return node.flatMap(n => render(n, depth + 1));
  if (typeof node.type === "function") {
    return render(node.type({ ...node.props, children: node.children }), depth + 1);
  }
  return [{ tag: node.type, props: node.props }].concat(
    node.children.flatMap(c => render(c, depth + 1))
  );
}

/* ---------- sandbox mirroring index.html's load order ---------- */

const rootEl = { innerHTML: "", id: "root" };
const footEl = { textContent: "" };
let rendered = null;

const sandbox = {
  console,
  window: {},
  document: {
    getElementById: id => (id === "root" ? rootEl : footEl),
    addEventListener() {},
    removeEventListener() {},
    activeElement: null,
  },
  React,
  ReactDOM: { createRoot: () => ({ render(tree) { rendered = tree; } }) },
};
sandbox.window.React = React;
sandbox.window.ReactDOM = sandbox.ReactDOM;
sandbox.globalThis = sandbox;

const ctx = vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, "search-index.js"), "utf8"), ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, "search-filter.js"), "utf8"), ctx);
vm.runInContext(
  "var module=undefined, exports=undefined, define=undefined;" +
    fs.readFileSync(path.join(ROOT, "tools/vendor/htm.umd.js"), "utf8"),
  ctx
);
sandbox.window.htm = sandbox.htm;

console.log("\nDependencies:");
check("vendored htm loaded", typeof sandbox.htm === "function");
check("search-index reached window", Array.isArray(sandbox.window.LEARN_INDEX));
check("filterEntries reached window", typeof sandbox.window.filterEntries === "function");

console.log("\nRunning the app:");
let threw = null;
try { vm.runInContext(appSrc, ctx); } catch (e) { threw = e; }
check("executes without throwing", threw === null, threw && threw.message);
check("used React, not the CDN-failure fallback", rendered !== null);
check("fallback did not overwrite the root", rootEl.innerHTML === "", rootEl.innerHTML.slice(0, 60));
check("footer count written", /page/.test(footEl.textContent), footEl.textContent);

console.log("\nRendering (parses every htm template):");
let flat = null;
try {
  hookIndex = 0;
  flat = render(rendered);
  check("tree renders", true);
} catch (e) {
  check("tree renders", false, e.message);
}

if (flat) {
  const tags = flat.filter(n => typeof n === "object");
  const text = flat.filter(n => typeof n === "string").join(" ");
  const entries = sandbox.window.LEARN_INDEX;
  const cards = tags.filter(n => n.props && n.props.class === "card");

  check("one card per indexed page", cards.length === entries.length, cards.length + " vs " + entries.length);
  check("card hrefs match indexed paths", cards.every(c => entries.some(e => e.path === c.props.href)));
  check("no card href is absolute", cards.every(c => !String(c.props.href).startsWith("/")));
  check("search input rendered", tags.some(n => n.props && n.props.class === "search"));
  const kinds = new Set(entries.map(e => e.type));
  check("one chip per type plus All",
    tags.filter(n => n.props && n.props.class === "chip").length === kinds.size + 1,
    tags.filter(n => n.props && n.props.class === "chip").length + " chips for " + kinds.size + " types");
  const subjects = new Set(entries.map(e => e.subject));
  check("one subject chip per subject plus All",
    tags.filter(n => n.props && n.props.class === "chip subj").length === subjects.size + 1,
    tags.filter(n => n.props && n.props.class === "chip subj").length + " chips for " + subjects.size + " subjects");
  check("subject headings rendered",
    tags.filter(n => n.props && n.props.class === "subject").length === subjects.size);
  check("start-here badges match the index",
    tags.filter(n => n.props && n.props.class === "badge start").length ===
      entries.filter(e => e.status === "start-here").length);
  check("ahead-of-sequence badges match the index",
    tags.filter(n => n.props && n.props.class === "badge warn").length ===
      entries.filter(e => e.status === "ahead-of-sequence").length);
  check("result count rendered",
    new RegExp(entries.length + "\\s+of\\s+" + entries.length).test(text), text.slice(0, 80));
}

/* ---------- second run: the #subject deep link ----------
   The first run has no window.location, which is what proves the guards hold.
   This run gives the app a real location and history, so the deep link and the
   hash writing are actually exercised rather than skipped. */

console.log("\nDeep link:");

const indexed = sandbox.window.LEARN_INDEX;
const deepSubject = [...new Set(indexed.map(e => e.subject))].sort()[1] || null;

if (!deepSubject) {
  check("a second subject exists to deep link to", false, "only one subject in the index");
} else {
  let replaced = null;
  const rootEl2 = { innerHTML: "", id: "root" };
  const footEl2 = { textContent: "" };
  let rendered2 = null;

  const sb2 = {
    console,
    window: {
      location: { hash: "#" + deepSubject.toLowerCase(), pathname: "/Learn/", search: "" },
      history: { replaceState(_state, _title, url) { replaced = url; } },
    },
    document: {
      getElementById: id => (id === "root" ? rootEl2 : footEl2),
      addEventListener() {},
      removeEventListener() {},
      activeElement: null,
    },
    React,
    ReactDOM: { createRoot: () => ({ render(tree) { rendered2 = tree; } }) },
  };
  sb2.window.React = React;
  sb2.window.ReactDOM = sb2.ReactDOM;
  sb2.globalThis = sb2;

  const ctx2 = vm.createContext(sb2);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "search-index.js"), "utf8"), ctx2);
  vm.runInContext(fs.readFileSync(path.join(ROOT, "search-filter.js"), "utf8"), ctx2);
  vm.runInContext(
    "var module=undefined, exports=undefined, define=undefined;" +
      fs.readFileSync(path.join(ROOT, "tools/vendor/htm.umd.js"), "utf8"),
    ctx2
  );
  sb2.window.htm = sb2.htm;

  let threw2 = null;
  try { vm.runInContext(appSrc, ctx2); } catch (e) { threw2 = e; }
  check("executes with a real location and history", threw2 === null, threw2 && threw2.message);

  hookState.length = 0;
  hookIndex = 0;
  let flat2 = null;
  try { flat2 = render(rendered2); check("tree renders from a deep link", true); }
  catch (e) { check("tree renders from a deep link", false, e.message); }

  if (flat2) {
    const nodes = flat2.filter(n => typeof n === "object" && n.props);
    const cards2 = nodes.filter(n => n.props.class === "card");
    const want = indexed.filter(e => e.subject === deepSubject);

    check("#" + deepSubject.toLowerCase() + " preselects that subject",
      cards2.length === want.length,
      cards2.length + " cards shown vs " + want.length + " " + deepSubject + " pages");
    check("every card shown belongs to that subject",
      cards2.every(c => want.some(e => e.path === c.props.href)));

    const subjChips = nodes.filter(n => n.props.class === "chip subj");
    check("subject chips carry a click handler",
      subjChips.length >= 2 && typeof subjChips[0].props.onClick === "function");

    if (subjChips.length >= 2 && typeof subjChips[1].props.onClick === "function") {
      subjChips[1].props.onClick();
      check("choosing a subject writes a hash",
        typeof replaced === "string" && replaced.indexOf("#") !== -1, replaced);
      subjChips[0].props.onClick();
      check("choosing All subjects clears the hash", replaced === "/Learn/", replaced);
    }
  }
}

console.log("\n" + (failed ? "RESULT: FAIL (" + failed + ")" : "RESULT: PASS"));
process.exit(failed ? 1 : 0);
