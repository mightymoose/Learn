# Excel Glossary

The canonical language for this workspace. Lessons, reference cards and learning records
use these terms and no synonyms.

A term goes in here only after Carla uses it correctly, not when a lesson first
introduces it. The glossary records compressed knowledge. It is not a dictionary to read
ahead.

## Terms

_No terms yet._

Pending from tier 1: cell reference, absolute reference, range, Table, structured
reference, spill. They get promoted once Carla uses them correctly on something the
lesson did not cover.

## Names fixed on entry

Excel documentation, forums and the interface itself use several names for the same
thing. Pick one and hold it.

- **Table**, capital T, means the object made by <span>Insert &gt; Table</span>. A plain
  block of cells is a **range**. Never call a range a table. This distinction carries the
  whole of lesson 3.
- **Formula** is the expression you type. **Function** is a built-in like SUM. A formula
  contains functions. Do not swap them.
- **Absolute reference** means the dollar-sign form, `$B$2`. Avoid "locked" and "fixed",
  which are common in forums but not in the documentation.
- **Spill** means one formula returning many cells. Use it only for dynamic arrays, from
  tier 3. Do not use it earlier.
- **PivotTable**, one word, capital P and T. That is Microsoft's spelling.
- **Workbook** is the file. **Worksheet** is one tab inside it. "Spreadsheet" is
  ambiguous between the two, so lessons avoid it.

## Ambiguities to resolve when reached

- **Data model** means the in-memory engine behind Power Pivot. It is not "the data" and
  not the workbook layout. Fix this before tier 4.
- **Query** means a Power Query step chain, not a database query. Fix this at tier 4.
- **Measure** and **calculated column** are different objects in the data model. They are
  the first thing people confuse. Resolve on entry to tier 4.
