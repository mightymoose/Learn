/* quiz.js — shared drill engine for the Lang Algebra teaching workspace.
   Every lesson links this file. Two drill types, both give feedback on the click.

   Multiple choice
   ---------------
   <div class="drill" data-drill="choice">
     <p class="drill-q">Question?</p>
     <ul class="opts">
       <li><button class="opt" data-correct="true"  data-why="Because ...">Answer A</button></li>
       <li><button class="opt" data-correct="false" data-why="No, because ...">Answer B</button></li>
     </ul>
     <p class="feedback"></p>
   </div>

   Ordering
   --------
   <div class="drill" data-drill="order">
     <p class="drill-q">Put the steps in order.</p>
     <ul class="seq">
       <li><button class="opt" data-pos="2">Second step</button></li>
       <li><button class="opt" data-pos="1">First step</button></li>
     </ul>
     <p class="feedback"></p>
     <button class="drill-reset">Reset</button>
   </div>

   Keep answer strings the same length across options: length is a tell. */

(function () {
  "use strict";

  function say(box, text) {
    var fb = box.querySelector(".feedback");
    if (!fb) return;
    fb.textContent = text;
    fb.classList.remove("show");
    void fb.offsetWidth; // restart the fade
    fb.classList.add("show");
  }

  /* ---------- multiple choice ---------- */

  function initChoice(box) {
    var opts = Array.prototype.slice.call(box.querySelectorAll(".opt"));

    opts.forEach(function (btn) {
      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var right = btn.getAttribute("data-correct") === "true";

        btn.classList.add(right ? "correct" : "wrong");
        say(box, btn.getAttribute("data-why") || "");

        if (right) {
          // Lock the drill once it is solved, and reveal the correct answer.
          opts.forEach(function (o) { o.disabled = true; });
        } else {
          // Wrong answers are struck out but the rest stay live: retrieval, not elimination.
          btn.disabled = true;
        }
      });
    });
  }

  /* ---------- ordering ---------- */

  function initOrder(box) {
    var opts = Array.prototype.slice.call(box.querySelectorAll(".opt"));
    var total = opts.length;
    var next = 1;

    function reset() {
      next = 1;
      opts.forEach(function (o) {
        o.disabled = false;
        o.classList.remove("placed", "wrong", "correct");
        var slot = o.querySelector(".slot");
        if (slot) slot.textContent = "";
      });
      say(box, "");
    }

    opts.forEach(function (btn) {
      if (!btn.querySelector(".slot")) {
        var s = document.createElement("span");
        s.className = "slot";
        btn.insertBefore(s, btn.firstChild);
      }

      btn.addEventListener("click", function () {
        if (btn.disabled) return;
        var pos = parseInt(btn.getAttribute("data-pos"), 10);

        if (pos === next) {
          btn.classList.add("placed");
          btn.disabled = true;
          btn.querySelector(".slot").textContent = next;
          next += 1;
          if (next > total) {
            say(box, "Correct order. That is the whole argument.");
          } else {
            say(box, "Step " + (next - 1) + " placed.");
          }
        } else {
          btn.classList.add("wrong");
          say(box, "Not step " + next + ". Try another.");
          window.setTimeout(function () { btn.classList.remove("wrong"); }, 700);
        }
      });
    });

    var rb = box.querySelector(".drill-reset");
    if (rb) rb.addEventListener("click", reset);
  }

  function init() {
    document.querySelectorAll('[data-drill="choice"]').forEach(initChoice);
    document.querySelectorAll('[data-drill="order"]').forEach(initOrder);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
