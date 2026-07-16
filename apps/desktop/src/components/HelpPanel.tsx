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
        <code>optional</code>.
      </p>

      <h3>Relationships</h3>
      <pre>{`rel owns "Owns" user 1-N account
rel logs "Logs" user 1-N audit identifying

# n-ary: declare, then link each participant
rel deliver "Deliver"
link deliver supplier 1
link deliver product  N
link deliver project  N total`}</pre>
      <p>
        Cardinality: <code>1</code> = one, <code>N</code> = many, or ranges like{' '}
        <code>0..1</code>, <code>1..*</code>.
      </p>

      <h3>Chen mapping</h3>
      <p>
        entity → rectangle · relationship → diamond · attribute → ellipse · weak /
        identifying → double border · cardinality → connector label.
      </p>

      <h3>Free-form primitives</h3>
      <pre>{`rect  a "A" @40,40 160x64 fill=#e5ffd6 double
arrow a -> b "label" dashed
line  a -- b`}</pre>
      <p>Primitives render as-is in every notation.</p>

      <p style={{ marginTop: 16 }}>
        Full reference:{' '}
        <code>docs/DSL.md</code> · <a href={REPO_URL}>{REPO_URL.replace('https://', '')}</a>
      </p>
    </aside>
  );
}
