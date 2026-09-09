# 🎛️ Switchboard - v1.1.7

## 🐛 Fix: Group Controller in a subgraph you haven't opened
The Group Controller found its target group **empty** whenever the graph it lives in was not the one on screen, so a Controller inside a subgraph silently changed nothing unless you had entered that subgraph; queue time included. litegraph works group membership out from render-time bounding rects, which read as all-zero for nodes that were never drawn. Membership is now derived from each node's position and size, which are always valid, using the same centre-inside-group rule.

## 🔧 Backend nodes ported to the V3 node schema
**Value on Boolean** and **Boolean Switch** now use `comfy_api.latest` (`io.Schema` / `ComfyExtension`) instead of the legacy `NODE_CLASS_MAPPINGS` shape. Node ids, socket names and socket types are unchanged, so existing workflows load exactly as before. The hand-rolled `*` wildcard type is replaced by the sanctioned `io.AnyType`.

> Needs a ComfyUI recent enough to ship the V3 node API (`comfy_api.latest`). The Controllers are unaffected either way.

-# Update via ComfyUI Manager, or `git pull` in `custom_nodes/comfyui-switchboard` and restart. No new dependencies.

# 🎛️ Switchboard - v1.1.6

## 🐛 Fix: Promoted subgraph booleans control targets again
A recent ComfyUI change stopped **promoted widgets** from writing their value back down into the node they were promoted from. A Controller wired to, say, a `PrimitiveBoolean` inside a subgraph therefore kept reading that node's now-permanently-stale local value, and the toggle on the subgraph node did nothing.

Boolean resolution now follows the wire instead of trusting a stale value:

- A widget whose slot has an **incoming link** is skipped; the link is followed to whatever actually drives it.
- When the matching input on the subgraph node carries **no link**, the **promoted widget** on that node is read directly.
- A **subgraph instance** is descended into *before* reading a widget off it, so an unrelated promoted boolean can no longer be picked up for the output that was actually tapped.

Applies to the **Group Controller**, the **Node Controller** and the **Wired Controller** alike; they all share one resolver.

-# Update via ComfyUI Manager, or `git pull` in `custom_nodes/comfyui-switchboard` and restart. No new dependencies.
