# Working Notes

Scratchpad for how this workspace runs. Not teaching content.

## The source PDF is a scan

`sources/Serge Lang - Algebra.pdf` has **no text layer and no bookmarks**. `get_text()`
returns an empty string on every page. To read or cite anything, render the page to an
image first and read the image.

`pdftotext`, `pdfinfo`, and `mutool` are not installed. PyMuPDF is, under the system
`python3`.

## Page offset (verified, do not re-derive)

For the main body, in arabic numerals:

    pdf_index = printed_page + 14

Checked against printed p. 32, which is PDF index 46, and printed p. 57, which is
PDF index 71. Front matter uses a different offset: `printed_roman = pdf_index + 2`.

## Render recipe

```python
import fitz
d = fitz.open("sources/Serge Lang - Algebra.pdf")
printed = 57
d[printed + 14].get_pixmap(dpi=150).save(f"/tmp/lang-p{printed}.png")
```

150 dpi is enough to read the body text and the commutative diagrams.

## Citation rule for this workspace

Never cite a Lang page from memory. Render it, read it, then cite it. The book is long
enough and familiar enough that plausible-but-wrong page numbers are easy to produce and
hard to notice. Same rule for external links: open them before adding them to
[RESOURCES.md](./RESOURCES.md).

## Shell gotcha

Ryan's `ls` is aliased to a tool that hides git-ignored paths, so `sources/` is invisible
to a plain `ls`. Use `command ls` to see it.

## Teaching preferences

- Ryan writes in Simplified Technical English and expects the same back. Short common
  words, active voice with a named actor, one idea per sentence, no semicolons or em
  dashes. This applies to lesson prose too.
- Mission is mastery, not coverage. Favour retrieval practice and spacing over
  moving through more of the book.

## Route through the book

Sequential, from Chapter I, §1. See [MISSION.md](./MISSION.md) and learning record 0002.
Chapter I sections and their starting pages, from the contents on p. xi:

| § | Title | Page | Lesson |
|---|---|---|---|
| 1 | Monoids | 3 | 0001 |
| 2 | Groups | 7 | next |
| 3 | Normal subgroups | 13 | |
| 4 | Cyclic groups | 23 | |
| 5 | Operations of a group on a set | 25 | |
| 6 | Sylow subgroups | 33 | |
| 7 | Direct sums and free abelian groups | 36 | |
| 8 | Finitely generated abelian groups | 42 | |
| 9 | The dual group | 46 | |
| 10 | Inverse limit and completion | 49 | |
| 11 | Categories and functors | 53 | card written |
| 12 | Free groups | 66 | |

A section below Ryan's floor still gets a lesson. The lesson covers what Lang does there
that a first course does not, never the first-course definition.

## Lesson conventions

- Every lesson links `assets/lesson.css` and `assets/quiz.js`. Do not inline styles or
  drill code in a lesson.
- Quiz options are written to the same length. Length is a tell.
- Commutative diagrams are hand-written inline SVG using the `.diagram` class, so they
  follow the light and dark palettes and print correctly.
