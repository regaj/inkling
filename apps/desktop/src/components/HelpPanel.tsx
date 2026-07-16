/** In-app syntax help — mirrors docs/DSL.md in miniature. */
import { REPO_URL } from '../constants.js';

export function HelpPanel(): JSX.Element {
  return (
    <aside className="help" aria-label="Syntax help">
      <h2>Syntax</h2>
      <p>
        Declare, then link. Each line is one statement: it either declares a shape (with a
        unique <code>id</code>) or connects two by their ids. The id is a handle — it is never
        drawn. Lines starting with <code>#</code> are comments.
      </p>

      <h3>Choose a notation</h3>
      <pre>{`notation chen   # chen | crowsfoot | uml | idef1x | minmax
title "My Model"
direction LR    # or TB`}</pre>
      <p>The same model renders in any notation — switch from the toolbar.</p>

      <h3>Entities &amp; attributes</h3>
      <pre>{`entity user "User"
weak   audit "Audit"          # weak entity
attr user.id   "id"   key      # key attribute
attr user.name "name"
attr user.tags "tags" multi    # multivalued
attr audit.seq "seq"  partial  # partial key`}</pre>
      <p>
        Flags: <code>key</code>, <code>partial</code>, <code>derived</code>, <code>multi</code>,{' '}
        <code>optional</code>. By default attributes are listed inside the entity box; add{' '}
        <code>attrs ellipse</code> at the top for classic Chen satellite ellipses (
        <code>attrs box</code> switches back).
      </p>

      <h3>Relationships</h3>
      <pre>{`rel owns "Owns" user 1-N account
rel logs "Logs" user 1-N audit identifying

# extra markers on the whole relationship:
rel covers "Covers" audit N-1 site total    # total participation → double line
rel points "Points" a 1-N b arrow           # arrowhead toward each entity`}</pre>
      <p>
        <code>1</code> = one, <code>N</code>/<code>M</code>/<code>*</code> = many, or ranges{' '}
        (<code>0..1</code>, <code>1..*</code>). Flags after the relationship:{' '}
        <code>identifying</code> (double diamond, for weak entities), <code>total</code> (double
        participation line), <code>arrow</code> (arrowheads).
      </p>

      <h3>n-ary relationships &amp; per-side flags</h3>
      <pre>{`# declare the relationship, then link each entity — one link per side,
# so total / arrow / role can differ per participant:
rel deliver "Deliver"
link deliver supplier 1
link deliver product  N  total       # this side is total
link deliver project  N  arrow role "for"`}</pre>
      <p>
        <code>link &lt;rel&gt; &lt;entity&gt; &lt;card&gt; [role "…"] [total] [arrow]</code> —{' '}
        <code>total</code> doubles that side's line, <code>arrow</code> adds an arrowhead,{' '}
        <code>role</code> labels it.
      </p>

      <h3>Specialization (ISA)</h3>
      <pre>{`entity audit  "Audit"
entity passed "Passed Audit"
entity failed "Failed Audit"
attr failed.hazards "hazards"

# super -> subclasses, with constraints
isa audit [passed, failed] disjoint total`}</pre>
      <p>
        Draws an EER circle — <code>d</code> disjoint / <code>o</code> overlapping — with a
        double line to the superclass when <code>total</code> (else <code>partial</code>), and
        a <code>⊂</code> on each subclass.
      </p>

      <h3>Chen mapping</h3>
      <p>
        entity → rectangle · relationship → diamond · attribute → ellipse · weak /
        identifying → double border · cardinality → connector label.
      </p>

      <h3>Data structures</h3>
      <pre>{`array  a  "Scores" [10, 20, 30]
stack  s  "Stack"  [1, 2, 3]     # 3 is the top
queue  q  "Queue"  [a, b, c]     # a is the front
linked_list ll "List" [x, y, z]

# append / remove values (recompiles live)
push    s 4      # onto the stack top
pop     s        # remove the top
enqueue q d      # to the queue rear
dequeue q        # from the front
append  a 40     # array / list`}</pre>
      <p>Each renders real shapes — cells, pointers, front/rear and top markers.</p>

      <h3>Flowcharts &amp; direction</h3>
      <p>
        Build flowcharts from primitives and connect them; leave off <code>@x,y</code> and
        they auto-layout along <code>direction</code>:
      </p>
      <pre>{`direction TB      # TB · BT · LR · RL
rect    a "Start"
diamond b "Valid?"
rect    c "Save"
rect    d "Reject"
arrow a -> b
arrow b -> c "yes"
arrow b -> d "no"`}</pre>
      <p>
        <code>TB</code> top→bottom · <code>BT</code> bottom→top · <code>LR</code> left→right ·{' '}
        <code>RL</code> right→left. Same for ER diagrams.
      </p>

      <h3>Arrows &amp; connectors</h3>
      <pre>{`arrow a -> b "label"   # directed, with arrowhead
arrow a -> b dashed    # dashed
line  a -- b           # undirected`}</pre>
      <p>
        Endpoints can be any declared id — primitives <em>or</em> entities (e.g.{' '}
        <code>arrow engineer -&gt; site</code>). They attach to shape borders automatically.
      </p>

      <h3>Free-form primitives</h3>
      <pre>{`rect  a "A" @40,40 160x64 fill=#e5ffd6 double
ellipse hub "Hub" @300,120
text  note "Draft" @40,300 size=14`}</pre>
      <p>Primitives render as-is in every notation.</p>

      <p style={{ marginTop: 16 }}>
        Full reference:{' '}
        <code>docs/DSL.md</code> · <a href={REPO_URL}>{REPO_URL.replace('https://', '')}</a>
      </p>
    </aside>
  );
}
