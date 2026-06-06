# Example 2 - Node Controller

**Same one-boolean hi-res gate, but targeting a single node by id.**

Identical wiring to Example 1, except the target is an **individual node**
instead of a group. A single **Value on Boolean** (`true`/`false`) drives two
things from its `boolean` output:

1. **→ Node Controller (`995: Highres` input)** - governs node **995** (the
   Highres node).
   - `true`  = node **enabled** (it runs)
   - `false` = node **disabled** using its `↳ disable as` mode (**bypass** here)
2. **→ Boolean Switch (`boolean` input)** - selects the **Preview Image** source:
   - `on_true`  = the **Highres** node output
   - `on_false` = the plain **VAE Decode (Tiled)** output

One toggle, consistent result: `true` runs Highres and previews it; `false`
bypasses it and previews the base image.

**Group vs Node Controller - when to use which:**
- **Node Controller** targets by **id** (shown as `id: Title`), so retitling the
  node still works. Good for flipping one specific node - including a whole
  **subgraph node** (node 995 here is a subgraph), which bypasses everything
  inside it at once.
- **Group Controller** targets by group **title** - good for flipping a labelled
  region of the graph.

A boolean wired into a target *governs* it (overrides the target's toggle and
the master `ALL`); `↳ disable as` chooses bypass vs mute.

## Two fields not shown in the screenshot

Newer versions add these to **every** Controller; this example doesn't use them,
so leave them as-is:

- **`↦ patch`** (patch input, top of the node) - accepts a **Wired Controller**'s
  output. Unwired here = no effect.
- **`channel`** (text field) - subscribes the Controller to a **Wired
  Controller** by name. Blank here = no subscription.

Both are only for driving this Controller from a **Wired Controller** (see
Example 3). Empty/unwired, they do nothing and the example behaves exactly as
pictured.

> Every node here ships with Switchboard - no other custom nodes needed.
