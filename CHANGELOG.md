# 🎛️ Switchboard - v1.1.6

## 🐛 Fix: Promoted subgraph booleans control targets again
A recent ComfyUI change stopped **promoted widgets** from writing their value back down into the node they were promoted from. A Controller wired to, say, a `PrimitiveBoolean` inside a subgraph therefore kept reading that node's now-permanently-stale local value, and the toggle on the subgraph node did nothing.

Boolean resolution now follows the wire instead of trusting a stale value:

- A widget whose slot has an **incoming link** is skipped; the link is followed to whatever actually drives it.
- When the matching input on the subgraph node carries **no link**, the **promoted widget** on that node is read directly.
- A **subgraph instance** is descended into *before* reading a widget off it, so an unrelated promoted boolean can no longer be picked up for the output that was actually tapped.

Applies to the **Group Controller**, the **Node Controller** and the **Wired Controller** alike; they all share one resolver.

-# Update via ComfyUI Manager, or `git pull` in `custom_nodes/comfyui-switchboard` and restart. No new dependencies.
