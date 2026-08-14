/* Exercise the real assets/quiz.js against the real drill markup in every
   lesson, using a minimal DOM shim. Verifies the feedback loop actually
   works, which markup validation cannot tell you.

   Run: node tools/test-drills.js */

const fs = require("fs");
const path = require("path");

const ROOT = path.dirname(__dirname);
const SKIP_DIRS = new Set([".git", ".claude", "node_modules", "tools"]);

let failed = 0;
function check(name, cond, extra) {
  if (cond) console.log("  pass  " + name);
  else { console.log("  FAIL  " + name + (extra !== undefined ? "  [" + extra + "]" : "")); failed++; }
}

/* ---------- tiny DOM ---------- */

class El {
  constructor(tag, cls, attrs, text) {
    this.tagName = tag;
    this.className = cls || "";
    this.attrs = attrs || {};
    this._text = text || "";
    this.children = [];
    this.handlers = {};
    this.disabled = false;
    this.offsetWidth = 0;
    const self = this;
    this.classList = {
      add: (...c) => c.forEach(x => { if (!self._cls().includes(x)) self.className = (self.className + " " + x).trim(); }),
      remove: (...c) => { self.className = self._cls().filter(x => !c.includes(x)).join(" "); },
      contains: c => self._cls().includes(c),
    };
  }
  _cls() { return this.className.split(/\s+/).filter(Boolean); }
  getAttribute(n) { return n in this.attrs ? this.attrs[n] : null; }
  setAttribute(n, v) { this.attrs[n] = v; }
  addEventListener(ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); }
  click() { (this.handlers.click || []).forEach(f => f.call(this, {})); }
  insertBefore(node, ref) {
    const i = ref ? this.children.indexOf(ref) : 0;
    this.children.splice(i < 0 ? 0 : i, 0, node);
  }
  appendChild(n) { this.children.push(n); return n; }
  get firstChild() { return this.children[0] || null; }
  get textContent() {
    if (this.children.length === 0) return this._text;
    return this.children.map(c => c.textContent).join("") + this._text;
  }
  set textContent(v) { this._text = String(v); this.children = []; } // the real DOM coerces
  _all(out) { for (const c of this.children) { out.push(c); c._all(out); } return out; }
  _match(sel) {
    if (sel.startsWith(".")) return this._cls().includes(sel.slice(1));
    const m = sel.match(/^\[([\w-]+)="([^"]+)"\]$/);
    if (m) return this.getAttribute(m[1]) === m[2];
    return this.tagName === sel;
  }
  querySelectorAll(sel) {
    const r = this._all([]).filter(e => e._match(sel));
    r.forEach = Array.prototype.forEach.bind(r);
    return r;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

/* ---------- find lessons ---------- */

function lessonFiles() {
  const out = [];
  for (const sub of fs.readdirSync(ROOT).sort()) {
    if (SKIP_DIRS.has(sub) || sub.startsWith(".")) continue;
    const d = path.join(ROOT, sub, "lessons");
    if (!fs.existsSync(d) || !fs.statSync(d).isDirectory()) continue;
    for (const f of fs.readdirSync(d).sort()) {
      if (f.endsWith(".html")) out.push(path.join(sub, "lessons", f));
    }
  }
  return out;
}

const quizSrc = fs.readFileSync(path.join(ROOT, "algebra/assets/quiz.js"), "utf8");
const files = lessonFiles();
console.log("Lessons found: " + files.length + "\n");
if (files.length === 0) { console.log("Nothing to test."); process.exit(0); }

let totalDrills = 0;

for (const rel of files) {
  console.log(rel);
  const src = fs.readFileSync(path.join(ROOT, rel), "utf8");

  const root = new El("body");
  const document = {
    readyState: "complete",
    createElement: t => new El(t),
    querySelectorAll: sel => root.querySelectorAll(sel),
    addEventListener: () => {},
  };
  const windowStub = { setTimeout: (f, ms) => setTimeout(f, ms) };

  const drills = [];
  const drillRe = /<div class="drill" data-drill="(choice|order)">([\s\S]*?)<\/div>/g;
  let m;
  while ((m = drillRe.exec(src))) {
    const kind = m[1], body = m[2];
    const box = new El("div", "drill", { "data-drill": kind });
    const list = new El("ul", kind === "order" ? "seq" : "opts");
    box.appendChild(list);
    const btnRe = /<button class="opt"([^>]*)>([\s\S]*?)<\/button>/g;
    let b;
    while ((b = btnRe.exec(body))) {
      const attrs = {};
      let a; const aRe = /([\w-]+)="([^"]*)"/g;
      while ((a = aRe.exec(b[1]))) attrs[a[1]] = a[2];
      list.appendChild(new El("button", "opt", attrs, b[2].replace(/<[^>]+>/g, "").trim()));
    }
    box.appendChild(new El("p", "feedback"));
    if (/drill-reset/.test(body)) box.appendChild(new El("button", "drill-reset"));
    root.appendChild(box);
    drills.push({ kind, box });
  }

  if (drills.length === 0) { console.log("  (no drills)"); continue; }
  totalDrills += drills.length;

  new Function("document", "window", "setTimeout", quizSrc)(document, windowStub, setTimeout);

  drills.forEach((d, i) => {
    const opts = d.box.querySelectorAll(".opt");
    const fb = d.box.querySelector(".feedback");
    const label = "drill " + (i + 1) + " (" + d.kind + ")";

    if (d.kind === "choice") {
      const wrong = opts.find(o => o.getAttribute("data-correct") === "false");
      const right = opts.find(o => o.getAttribute("data-correct") === "true");
      wrong.click();
      check(label + ": wrong answer struck out and explained",
        wrong.classList.contains("wrong") && fb.textContent.length > 15);
      check(label + ": other options stay live",
        opts.filter(o => !o.disabled).length === opts.length - 1);
      right.click();
      check(label + ": correct answer locks the drill",
        right.classList.contains("correct") && opts.every(o => o.disabled));
    } else {
      const byPos = n => opts.find(o => o.getAttribute("data-pos") === String(n));
      const n = opts.length;
      byPos(n).click();
      check(label + ": out-of-order click rejected", !byPos(n).disabled && /Not step 1/.test(fb.textContent));
      let ok = true;
      for (let k = 1; k <= n; k++) {
        byPos(k).click();
        if (!byPos(k).disabled || !byPos(k).classList.contains("placed")) ok = false;
        if (byPos(k).querySelector(".slot").textContent !== String(k)) ok = false;
      }
      check(label + ": all " + n + " steps accepted in order with slot numbers", ok);
      check(label + ": completion message shown", /Correct order/.test(fb.textContent));
      const reset = d.box.querySelector(".drill-reset");
      if (reset) {
        reset.click();
        check(label + ": reset clears every step",
          opts.every(o => !o.disabled && !o.classList.contains("placed")));
      }
    }
  });
}

console.log("\n" + totalDrills + " drill(s) exercised.");
console.log(failed ? "RESULT: FAIL (" + failed + ")" : "RESULT: PASS");
process.exit(failed ? 1 : 0);
