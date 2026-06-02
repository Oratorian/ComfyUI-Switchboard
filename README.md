# 🎛️ Switchboard - Advanced Group/Node Controllers for ComfyUI

Client-side nodes for enabling/disabling parts of your graph - by hand or from a
wired boolean. A more flexible take on rgthree's *Fast Group Bypasser*. Two
nodes, identical behaviour, different target:

| Node | Targets | Add list shows |
|------|---------|----------------|
| **Group Controller** | groups, by **title** | the group titles in your graph |
| **Node Controller** | individual nodes, by **id** | nodes as `id: Title` |

## Install

Copy this folder into `ComfyUI/custom_nodes/` (final path
`ComfyUI/custom_nodes/comfyui-switchboard/`) and restart ComfyUI, then hard-reload
the browser (Ctrl/Cmd+Shift+R). There are no Python dependencies - these are pure
front-end JavaScript nodes that never run on the server. In the Add-Node menu the
nodes live under the **🎛️ Switchboard** category.

---

## Group Controller

![Group Controller - a Boolean (true) wired into the "Test" group input keeps the Test group enabled; disable mode is mute](assets/GroupController.png)

Above: a **Boolean** node (`value = true`) is wired into the controller's **`Test`**
input. The controller drives the **`Test`** group on the right (a Save Image
node). Because the boolean is `true`, the group is **enabled**; if it were
`false`, the group would be **muted** (its `↳ disable as` setting).

## Node Controller

![Node Controller - ALL is disabled, but node "8: VAE Decode" stays enabled because a Boolean (true) is wired to it, overriding the master ALL toggle](assets/NodeController.png)

Above: the **`ALL`** master toggle is set to **disabled**, yet node **`8: VAE
Decode`** is still **enabled** - because a **Boolean** (`true`) is wired to it.
**A connected boolean overrides the `ALL` broadcast.** This is the key behaviour,
described in full below.

---

## Anatomy of the node

From top to bottom, a controller shows:

1. **Input sockets (top of the node).** One `BOOLEAN` socket per controlled
   target, labelled with the target (the group title, or `id: Title` for nodes).
   Wiring is **optional** - see [Boolean inputs](#boolean-inputs). *(Under Nodes
   2.0 the sockets render at the very top of the node, slightly detached from
   their matching toggle row - that's a renderer quirk, not a bug.)*
2. **`ALL`** - the **master broadcast** toggle. Flips every *manually-controlled*
   target on/off at once (see precedence below).
3. **One row pair per target:**
   - **`<target>` toggle** - `enabled` / `disabled` for that target. This is what
     a wired boolean drives.
   - **`↳ disable as`** - `bypass` or `mute`, i.e. *how* that target turns off.
     This stays editable at all times, even while a boolean holds the target on.
4. **`add`** - the **➕ Add group…/node…** dropdown. Pick a target to start
   controlling it. Lists only targets not already controlled.
5. **`remove`** - the **➖ Remove group…/node…** dropdown. Drops a target and
   **re-enables** it (so removing the controller never strands something
   disabled). The right-click menu also has **Remove controlled …** and
   **Refresh … list**.

### What `bypass` vs `mute` do

- **`bypass`** - the target's nodes are bypassed; data routes *around* them and
  the graph still runs.
- **`mute`** - the target's nodes (and everything downstream of them) are muted
  and don't execute at all.

---

## Boolean inputs

Every controlled target has its own `BOOLEAN` input socket. Wiring one is
**optional**.

- **Not wired** → the target is controlled **manually**: its own toggle and the
  `ALL` master toggle.
- **Wired** → the boolean **governs** that target. `True` = `enabled`,
  `False` = `disabled` (turned off using that target's `↳ disable as` mode).

### Precedence - a connected boolean wins

Once a boolean is connected to a target, **it is authoritative for that target's
on/off state and overrides everything else:**

| Action | Target with **no** boolean wired | Target **with** a boolean wired |
|--------|----------------------------------|---------------------------------|
| Click the target's toggle | changes it | reverts to the boolean's value |
| Flip the `ALL` master toggle | changes it | **ignored** - boolean still governs |
| Change `↳ disable as` | takes effect | takes effect (controls *how* it disables) |

This is exactly the **Node Controller** screenshot above: `ALL` is `disabled`,
but `8: VAE Decode` stays `enabled` because its boolean is `true`. Flipping `ALL`
does not touch boolean-governed targets - they only follow their input.

The boolean updates the target **live** as you flip the upstream value, and is
re-read once more **at queue time**, so the prompt that actually runs always
matches the inputs.

### What the boolean reads (and its one limitation)

Enabling/disabling a target changes the **mode** of the underlying node(s) - a
graph operation that happens **before** a prompt is queued. So the controller
reads the upstream boolean's value **in the browser**, by following the wire to
the source node's widget.

- ✅ Works great for **constant** Boolean/primitive nodes (a `True`/`False` you
  set in the UI).
- ❌ Does **not** track a boolean that is *computed at runtime* by another node -
  that value doesn't exist until execution, by which point the target's on/off
  state is already locked for that run. For runtime-computed gating you'd need a
  backend execution-blocking node instead (open an issue if you want that).

---

## Notes

- **Node Controller targets by id.** Nodes are matched by their stable id, so
  retitling a controlled node still works; the `id: Title` label is captured when
  you add it. Controllers can't target other controllers.
- **Survives save/load.** All state lives in node properties and is re-applied at
  queue time. Older saved Group Controllers are auto-migrated to the current
  format.

## Nodes 2.0 compatibility

These are client-side (virtual) nodes built on the legacy LiteGraph API - the
same class of node as rgthree's group tools. ComfyUI's **Nodes 2.0** (Vue
renderer) is currently opt-in and keeps a compatibility layer, so these load and
function there (toggles, booleans and queue-time apply all work). Caveats:

- The **core action** (setting nodes to active/bypass/mute) is graph data, not
  rendering - it works regardless of renderer.
- The **UI** uses legacy patterns (virtual node, dynamic widgets/inputs, context
  menu) that 2.0 may render inconsistently - e.g. input sockets float to the top
  of the node, and links to dynamically-added sockets may draw as straight lines
  instead of curves. These are cosmetic. Canvas-draw hooks are deliberately
  avoided (a timer replaces `onDrawForeground`) so live input tracking keeps
  working.

A Vue/V3-native rewrite would be the longer-term fix once those APIs are
documented.
