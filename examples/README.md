# Examples

Sample `.ink` documents. Open one in Inkling (**Open**, ⌘/Ctrl+O) or export it
from the CLI, then switch notations to compare how the same model renders.

| File | Shows off |
| --- | --- |
| [`construction-safety.ink`](construction-safety.ink) | Strong + weak entities, an identifying relationship, key / partial / multivalued attributes (the app's default document). |
| [`library.ink`](library.ink) | A compact schema that reads well in Crow's Foot / UML; range cardinalities (`1..*`, `0..*`). |
| [`university-ternary.ink`](university-ternary.ink) | An n-ary (ternary) relationship via the `link` form, plus a relationship attribute. |
| [`flowchart.ink`](flowchart.ink) | A flowchart from primitives, auto-laid-out by `direction` (TB/BT/LR/RL). |
| [`data-structures.ink`](data-structures.ink) | Array, stack, queue, and linked list with live `push`/`pop`/`enqueue`/`dequeue`/`append`. |

```sh
# render one from the CLI
pnpm --filter @inkling/cli start -- examples/library.ink -o library.svg --notation crowsfoot
```
