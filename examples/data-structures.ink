# Data structures, with live append/remove operations.
title "Data Structures"

array scores "Scores" [10, 20, 30, 40]

stack calls "Call Stack" [main, parse, eval]
push calls render          # render becomes the top

queue jobs "Job Queue" [a, b, c]
enqueue jobs d
dequeue jobs               # a leaves the front

linked_list list "Linked List" [7, 14, 21]
append list 28
