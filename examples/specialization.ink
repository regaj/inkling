# EER specialization: an audit is either passed or failed (disjoint, total).
notation chen
title "Audit Specialization"
direction TB

entity audit "Audit"
attr audit.adate "adate" key
attr audit.approved "approved"

entity passed "Passed Audit"

entity failed "Failed Audit"
attr failed.hazards "hazards"

# every audit is exactly one of {passed, failed}
isa audit [passed, failed] disjoint total
