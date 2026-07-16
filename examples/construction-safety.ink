# The default document — a construction-site safety model that exercises
# strong + weak entities, an identifying relationship, key / partial / multi
# attributes, and a range of cardinalities. Switch notations to compare.
notation chen
title "Construction Site Safety"
direction LR

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

weak audit "Safety Audit"
attr audit.seq "seq_no" partial
attr audit.score "score"
attr audit.notes "notes" optional

rel oversees "Oversees" supervisor 1-N engineer
rel assigned "Assigned To" engineer 0..*-1..* site
rel inspects "Inspects" engineer 1-N audit
rel covers "Covers" audit N-1 site identifying
