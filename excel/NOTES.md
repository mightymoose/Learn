# Excel workspace notes

## The learner is Carla

Read this before writing anything. Every other subject in this repo teaches Ryan. This
one does not. Lessons say "you" and mean Carla. Ryan commissioned the course on
2026-08-14 and is not the audience.

Carla was never interviewed. The mission is a reasoned guess, marked provisional in
[MISSION.md](./MISSION.md). Four questions are open. They are listed in learning record
0001.

## The version fork

Excel is not one product. What a lesson can teach depends on the build Carla runs.

| Feature | Microsoft 365 / 2021 / 2024 | Excel 2016 / 2019 |
|---|---|---|
| XLOOKUP | yes | no, use INDEX and MATCH |
| Dynamic arrays, FILTER, SORT, UNIQUE | yes | no, use helper columns |
| LAMBDA, LET | 365 only | no |
| Power Query | built in | 2016 needs an add-in |
| Power Pivot and DAX | Windows only | Windows only |

Tier 1 was written to sit entirely on the left of this fork **and** the right. It uses
nothing that varies. That was deliberate, so a wrong guess about Carla's version costs no
rework on what is already written.

Tier 2 cannot dodge it. Lesson 5 is the lookup lesson, and the lookup lesson is either an
XLOOKUP lesson or an INDEX and MATCH lesson. Ask before writing it.

Mac matters separately. Power Pivot does not exist on Mac. Power Query on Mac lags
Windows. Tier 4 changes shape if Carla is on a Mac.

## Conventions in this workspace

- Formulas render with `<span class="fx">`. Keys render with `<span class="kbd">`.
- Spreadsheets render with `<table class="grid">` inside `<div class="gridwrap">`.
  Never inline a grid. The component is in [assets/lesson.css](./assets/lesson.css).
- Sample data stays the same across lessons where possible. A learner who already knows
  the data spends working memory on the skill instead of the scenario. Tier 1 uses one
  small table of regional sales.
- **The tier 1 workbook layout is load-bearing. Do not move cells without checking
  lesson 3.** The data block is A1:F7. Column G is empty on purpose. The commission rate
  sits in H1 and I1, and the lesson 4 summary block starts at row 10.

  `Ctrl` `T` sizes a Table from the current region, which spreads out from the selected
  cell until it meets a fully blank row and a fully blank column. Put anything in column
  G and lesson 3 breaks: Excel proposes A1:H7, Carla gets a Table two columns too wide
  with 0.08 as a header, and the `$I$1` in her commission formula lands inside the
  Table's own header row. Lesson 2 states the gap, and lesson 3 tells her to check the
  proposed range reads `$A$1:$F$7`.
- Every function named in a lesson links to its Microsoft page on first use.

## Drill rules the check suite enforces

`tools/check-pages.py` will fail the build on these, so get them right first time.

- Every multiple-choice option needs `data-why`. Exactly one needs `data-correct="true"`.
- **All options in one choice drill must have the same word count.** Length is a tell.
- Do not nest a `<div>` inside a drill. The checker matches to the first `</div>`, so a
  nested one truncates the block and the drill reads as having no correct answer. Put a
  grid above the drill, never inside it.
- Ordering drills need `data-pos` values 1 to n with no gaps.
- Only two drill types exist, `choice` and `order`. `tools/test-drills.js` matches the
  exact string `<div class="drill" data-drill="choice">`, so copy it character for
  character.

## Open threads

- Tier 1 is written. Tiers 2 to 4 are planned only. The roadmap card marks which is which.
- No Anki deck yet. Add one once tier 1 is done and the terms are stable.
- The glossary is deliberately near-empty. Terms get promoted when Carla uses them
  correctly, not when a lesson introduces them.
