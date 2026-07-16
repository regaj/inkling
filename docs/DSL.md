# The Inkling DSL

The Inkling DSL is a compact, line-based text language for describing Entity-Relationship diagrams (and free-form drawings). The text is the single source of truth: the canvas is always a pure function of the document.

This is the complete language reference. For the architecture behind it, see [SPEC.md](../SPEC.md).

---

## General rules

- **One statement per line.** Each non-blank, non-comment line is a single statement.
- **Comments.** `#` starts a comment. It may be a whole line or trail a statement:

  ```ink
  # this whole line is a comment
  entity site "Site"   # this is a trailing comment
  ```

- **Blank lines** are ignored.
- **Keywords are case-insensitive** (`entity`, `Entity`, and `ENTITY` are the same). **Ids are case-sensitive** (`site` and `Site` are different nodes).
- **Labels are double-quoted** strings: `"Employee ID"`. Quotes are required whenever a label contains spaces.
- **Ids** are unquoted tokens used to reference nodes (`engineer`, `audit`, `inspects`).

---

## Document directives

Directives configure the whole document. Put them at the top by convention.

| Directive | Values | Default | Meaning |
| --- | --- | --- | --- |
| `notation <name>` | `chen`, `crowsfoot`, `uml`, `idef1x`, `minmax` | `chen` | The notation used to render the semantic model. The app's notation picker overrides this live. |
| `title "..."` | any label | — | An optional document/export title. It is metadata, not drawn on the canvas. |
| `direction <dir>` | `LR`, `RL`, `TB`, `BT` | `LR` | Auto-layout flow direction — left→right, right→left, top→bottom, bottom→top. Applies to ER graphs, flowcharts, and the layered layout in general. |
| `attrs <style>` (alias `attributes`) | `box`, `ellipse` | `box` | How Chen-family notations draw attributes: `box` lists them inside the entity box (compact); `ellipse` draws classic satellite ellipses (with key underline, dashed for derived, double for multivalued). |

```ink
notation chen
title "Site Safety"
direction LR
```

---

## Semantic ER statements

These describe the *logical* ER model. The active notation decides how each maps to shapes.

### `entity` — a strong entity

```ink
entity <id> "Label"
```

```ink
entity engineer "Engineer"
```

### `weak` — a weak entity

A weak entity depends on an identifying relationship for its identity.

```ink
weak <id> "Label"
```

```ink
weak audit "Audit"
```

### `attr` — an attribute

An attribute of an entity **or** a relationship. `owner` is the id of an entity or a relationship.

```ink
attr <owner>.<attrId> "Label" [key] [partial] [derived] [multi] [optional]
```

Flags (any combination, order-independent):

| Flag | Meaning |
| --- | --- |
| `key` | Primary / identifying key. |
| `partial` | Partial key of a weak entity (discriminator). |
| `derived` | Derived attribute (computed, not stored). |
| `multi` | Multivalued attribute. |
| `optional` | Nullable / optional. |

```ink
attr engineer.eid   "Employee ID" key
attr engineer.phone "Phone" multi optional
attr audit.seq      "Sequence" partial
attr site.area      "Area" derived
```

### `rel` — a relationship

A relationship connects entities. It has two forms, and any form can carry
**flags** that apply to the whole relationship.

**Binary sugar** — declares the relationship *and* both participation edges in one line:

```ink
rel <id> "Label" <A> <cardA>-<cardB> <B> [identifying] [total] [arrow]
```

`<cardA>-<cardB>` reads left-to-right: `cardA` is A's cardinality, `cardB` is B's.

**Declared form** — declares just the relationship node; you then wire each side up
with `link` (use this for n-ary / ternary relationships, or when the two sides need
different flags):

```ink
rel <id> "Label" [identifying] [total] [arrow]
```

**Relationship flags** (all optional):

| Flag | Effect |
| --- | --- |
| `identifying` | An identifying relationship — a **double diamond**. Use it to give a *weak* entity its identity from its owner. |
| `total` | **Total participation** — every entity instance must take part. Drawn as a **double line** (two parallel strokes). On the binary form it applies to *both* sides. |
| `arrow` | Draws an **arrowhead** pointing at each entity — handy for functional / directed relationships. On the binary form it applies to *both* sides. |

```ink
# binary sugar: one engineer inspects many sites
rel inspects "Inspects" engineer 1-N site

# identifying + total: a weak Audit belongs to exactly one Site, always
rel covers "Covers" audit N-1 site identifying total

# directed relationship with arrowheads
rel reports "Reports to" employee N-1 manager arrow
```

### `link` — one participation edge

`link` adds a **single** participation edge from a declared relationship to an
entity. Because there is one `link` per side, `total`, `arrow`, and `role` can
differ per participant — which the binary `rel` form can't express.

```ink
link <relId> <entityId> <card> [role "RoleName"] [total] [arrow]
```

- `role "..."` — an optional role name drawn on the edge.
- `total` — total participation for **this** side (double line).
- `arrow` — an arrowhead pointing at **this** entity.

```ink
# ternary relationship, each side wired separately
rel deliver "Deliver"
link deliver supplier 1
link deliver product  N  total          # products participate totally
link deliver project  N  arrow role "for"

# a weak entity's identifying relationship, with total participation
rel logs "Logs" identifying
link logs audit 1 total
link logs site  N role "Location"
```

> **Note.** `total` and `arrow` render in the Chen family (Chen / Min-Max), where
> participations are lines you can decorate. In Crow's Foot / UML / IDEF1X the
> equivalent information is already carried by the crow's-foot / multiplicity
> markers, so those flags are ignored there.

---

## Cardinality tokens

Cardinality is written the same way everywhere; each notation renders it differently.

| Token | Meaning | Equivalent range |
| --- | --- | --- |
| `1` | exactly one | `(1,1)` |
| `N`, `M`, `*` | one or many | `(1,N)` |
| `0..1` | zero or one (optional) | `(0,1)` |
| `1..1` | exactly one | `(1,1)` |
| `0..*` | zero or many | `(0,N)` |
| `1..*` | one or many | `(1,N)` |

Use bare `1` / `N` for the common cases and explicit ranges (`0..1`, `1..*`, …) when optionality matters.

### How each notation renders cardinality

| Notation | Rendering |
| --- | --- |
| **Chen** | Raw label (`"1"` / `"N"`) on the connector near each entity. |
| **Min-Max** | A `(min,max)` pair on the entity side of the edge. |
| **Crow's Foot** | Line-end symbols: `(1,1)` = bar + bar (one and only one); `(0,1)` = circle + bar; `(1,N)` = bar + crow's foot; `(0,N)` = circle + crow's foot. |
| **UML** | Multiplicity label: `1`, `0..1`, `1..*`, `0..*`, `*`. |
| **IDEF1X** | Identifying vs. non-identifying line styles plus cardinality markers. |

---

## Specialization (ISA)

Model an EER specialization / generalization hierarchy — a superclass entity and
its subclass entities:

```ink
entity audit  "Audit"
entity passed "Passed Audit"
entity failed "Failed Audit"
attr failed.hazards "hazards"

isa audit [passed, failed] disjoint total
```

`isa <super> [sub1, sub2, …] [disjoint|overlapping] [total|partial]`

- **disjoint** (default) draws a `d` circle; **overlapping** draws `o`.
- **total** draws a *double* line to the superclass (every superclass instance belongs to a subclass); **partial** (default) a single line.
- Each subclass line is marked with a subset symbol (`⊂`).
- The superclass and subclasses must be declared entities. Works in every notation.

---

## Primitive (escape-hatch) statements

Primitives are free-form and notation-independent — they render exactly as written, regardless of the active notation. Use them for annotations, legends, or diagrams the ER model doesn't cover.

Shared conventions:

- `@x,y` — an optional absolute position. Omit it to let auto-layout place the shape.
- `WxH` — an optional size, e.g. `160x80`.
- `fill=#hex`, `stroke=#hex` — optional colors.
- `double` — a double border.
- Connectors bind to shape **borders** automatically; you never place endpoints yourself.

| Statement | Form |
| --- | --- |
| Rectangle | `rect <id> "Label" @x,y [WxH] [fill=#hex] [stroke=#hex] [double]` |
| Ellipse | `ellipse <id> "Label" @x,y [WxH] [fill=#hex] [stroke=#hex] [double]` |
| Diamond | `diamond <id> "Label" @x,y [WxH] [fill=#hex] [stroke=#hex] [double]` |
| Text | `text <id> "words" @x,y [size=NN]` |
| Arrow | `arrow <a> -> <b> ["label"] [dashed]` |
| Line | `line <a> -- <b> ["label"] [dashed] [double]` |

```ink
rect note "Legend" @40,40 200x60 fill=#f6f6f6 stroke=#0E7C86
ellipse hub "Hub" @300,120 double
text caption "Draft — not final" @40,320 size=14
arrow note -> hub "see hub" dashed
line hub -- note double
```

---

## Flowcharts & direction

A flowchart is just primitives connected by arrows. **Leave off `@x,y`** and
Inkling auto-lays-out the shapes by following the connector graph in the
document's `direction`:

```ink
direction TB          # TB · BT · LR · RL
rect    start "Start"
diamond auth  "Valid credentials?"
rect    home  "Dashboard"
rect    retry "Show error"
rect    stop  "End"

arrow start -> auth
arrow auth  -> home  "yes"
arrow auth  -> retry "no"
arrow retry -> auth
arrow home  -> stop
```

- `TB` top→bottom · `BT` bottom→top · `LR` left→right · `RL` right→left.
- Diamonds read as decisions, rectangles as steps, ellipses as terminals — but nothing is enforced; use any shape.
- Mixing placed (`@x,y`) and coordless shapes is fine: placed ones stay put, the rest flow.
- The same `direction` also orients ER diagrams.

---

## Data structures

Inkling can draw common data structures and mutate them with operation
statements. Values are given as a comma-separated list in brackets; they may be
numbers or bare words (a value can't itself contain a comma).

| Statement | Draws |
| --- | --- |
| `array <id> "Label" [v1, v2, …]` | A row of indexed cells. |
| `stack <id> "Label" [v1, v2, …]` | A vertical LIFO — the **last** value is the top. |
| `queue <id> "Label" [v1, v2, …]` | A horizontal FIFO with `front` / `rear` markers. |
| `linked_list <id> "Label" [v1, …]` | `[value \| next]` nodes chained by pointer arrows, ending at `⌀`. |

Operations mutate a structure (the document recompiles, so the drawing updates live):

| Operation | Effect |
| --- | --- |
| `push <id> <value>` | Append to the top of a stack (or end of any structure). |
| `pop <id>` | Remove the top / last value. |
| `enqueue <id> <value>` | Add to the rear of a queue. |
| `dequeue <id>` | Remove from the front. |
| `append <id> <value>` | Append a value (array / linked list). |

```ink
stack calls "Call Stack" [main, parse, eval]
push calls render          # render is now the top

queue jobs "Job Queue" [a, b, c]
enqueue jobs d
dequeue jobs               # a leaves the front

linked_list list "List" [7, 14, 21]
array scores "Scores" [10, 20, 30]
append scores 40
```

Structures are notation-independent (identical in every notation) and are laid
out beneath any ER / flowchart content.

---

## Chen-notation mapping

For reference, this is how the default Chen renderer maps the semantic model to shapes:

| Model element | Chen shape |
| --- | --- |
| Entity | Rectangle |
| Weak entity | Double rectangle |
| Relationship | Diamond |
| Identifying relationship | Double diamond |
| Attribute | Ellipse |
| Key attribute | Ellipse with underlined label |
| Derived attribute | Dashed ellipse |
| Multivalued attribute | Double ellipse |
| Cardinality | Connector label |
| Total participation | Double line |

---

## Errors

The parser reports precise, actionable errors:

- **Unknown command** — the first token isn't a recognized statement keyword.
- **Duplicate id** — an id is declared more than once.
- **Malformed coordinate / cardinality** — e.g. a bad `@x,y` or an unrecognized cardinality token.
- **Reference to unknown id** — a `link`, `attr`, `arrow`, or `line` references an id that was never declared.

In the app, errors surface as a gutter marker, an inline squiggle, and a message — never by color alone.

---

## A complete example

```ink
notation chen
title "Site Safety"
direction LR

entity engineer "Engineer"
entity site     "Site"
weak   audit    "Audit"

attr engineer.eid  "Employee ID" key
attr engineer.name "Name"
attr site.name     "Name" key
attr audit.seq     "Sequence" partial

# binary relationship (sugar)
rel inspects "Inspects" engineer 1-N site

# identifying relationship for the weak entity (declared form)
rel logs "Logs" identifying
link logs audit 1 total
link logs site  N
```

Switch the notation picker (or the `notation` directive) to `crowsfoot`, `uml`, `idef1x`, or `minmax` to see the same model in another notation — the text stays the same.
