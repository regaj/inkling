/**
 * The sample document loaded on first run. Neutral, generic content: a
 * construction-site safety ER model that exercises strong and weak entities,
 * identifying relationships, key/partial/multivalued attributes, and a range of
 * cardinalities — so switching notations visibly shows off each one.
 */
export const SAMPLE_INK = `# Inkling — construction-site safety model
# Switch notations from the toolbar (Chen, Crow's Foot, UML, IDEF1X, Min-Max).
notation chen
title "Construction Site Safety"
direction LR

# ── Entities ────────────────────────────────────────────────
entity engineer "Engineer"
attr engineer.no "emp_no" key
attr engineer.name "name"
attr engineer.cert "certifications" multi

entity supervisor "Supervisor"
attr supervisor.no "emp_no" key
attr supervisor.name "name"

entity site "Site"
attr site.id "site_id" key
attr site.location "location"

# ── Weak entity: a Safety Audit is identified by the Site it belongs to ──
weak audit "Safety Audit"
attr audit.seq "seq_no" partial
attr audit.score "score"
attr audit.notes "notes" optional

# ── Relationships ───────────────────────────────────────────
rel oversees "Oversees" supervisor 1-N engineer
rel assigned "Assigned To" engineer 0..*-1..* site
rel inspects "Inspects" engineer 1-N audit
rel covers "Covers" audit N-1 site identifying
`;
