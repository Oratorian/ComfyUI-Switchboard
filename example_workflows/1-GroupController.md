# Example 1 - Group Controller

**One boolean gates a hi-res pass - both the work and the routing.**

A single **Value on Boolean** (`true`/`false`) is the master switch. Its
`boolean` output fans out to two places at once:

1. **→ Group Controller (`HighRes` input)** - governs the **HighRes** group.
   - `true`  = group **enabled** (the hi-res nodes run)
   - `false` = group **disabled** using its `↳ disable as` mode (here **bypass**,
     so the graph still runs, just skipping that group)
2. **→ Boolean Switch (`boolean` input)** - picks which image reaches
   **Preview Image**:
   - `on_true`  = the **HighRes** output
   - `on_false` = the plain **VAE Decode (Tiled)** output

So flipping the one boolean keeps everything in sync: `true` runs the hi-res
group **and** previews its result; `false` bypasses the group (saving the
compute) **and** previews the base image instead. No node is left running with
its output ignored, and nothing is previewed that wasn't actually produced.

**Key idea:** the boolean wired into a controller target *governs* that target -
it overrides the target's manual toggle and the master `ALL` toggle. The
`↳ disable as` selector still decides *how* it turns off (bypass vs mute).

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
