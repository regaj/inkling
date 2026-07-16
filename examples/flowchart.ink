# A flowchart — coordless primitives auto-laid-out top-to-bottom.
# Try changing `direction` to LR, RL, or BT.
title "Login Flow"
direction TB

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
