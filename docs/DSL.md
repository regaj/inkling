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

Two forms.

**Declared form** — declares a relationship node you then wire up with `link` (use this for n-ary / ternary relationships):

```ink
rel <id> "Label" [identifying]
```

**Binary sugar** — declares the relationship *and* both participation links in one line:

```ink
rel <id> "Label" <A> <cardA>-<cardB> <B> [identifying]
```

`identifying` marks an identifying relationship (used to give a weak entity its identity).

```ink
# binary sugar: engineer (1) inspects (N) site
rel inspects "Inspects" engineer 1-N site

# declared form for a ternary / weak-entity relationship
rel logs "Logs" identifying
```

### `link` — a participation edge

A participation edge from a relationship to an entity. Use with the declared `rel` form to build n-ary relationships.

```ink
link <relId> <entityId> <card> [role "RoleName"] [total]
```

- `role "..."` — an optional role name on the edge.
- `total` — total participation (drawn as a double line in Chen).

```ink
rel logs "Logs" identifying
link logs audit 1 total
link logs site  N role "Location"
```

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
