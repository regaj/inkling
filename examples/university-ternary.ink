# Demonstrates an n-ary (ternary) relationship via the link form,
# plus a relationship attribute.
notation chen
title "Course Offerings"
direction TB

entity student "Student"
attr student.id "sid" key
attr student.name "name"

entity course "Course"
attr course.code "code" key
attr course.title "title"

entity term "Term"
attr term.id "term_id" key

# a ternary relationship: a student takes a course in a term, with a grade
rel takes "Takes"
link takes student N
link takes course N
link takes term N
attr takes.grade "grade" optional
