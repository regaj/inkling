# A small library database — reads well in Crow's Foot or UML.
notation crowsfoot
title "Library"
direction LR

entity member "Member"
attr member.id "member_id" key
attr member.name "name"
attr member.email "email" optional

entity book "Book"
attr book.isbn "isbn" key
attr book.title "title"
attr book.year "year"

entity copy "Copy"
attr copy.barcode "barcode" key
attr copy.shelf "shelf"

# a book has many physical copies
rel of "Of" copy 1..*-1 book

# a member borrows copies over time
rel loan "Loan" member 1-0..* copy
attr loan.due "due_date"
attr loan.returned "returned" optional
