# Example 3 - Wired Controller

**Keep your booleans in one tidy subgraph and drive Controllers anywhere -
across subgraph boundaries, reliably.**

A **Wired Controller** is a *source*. It sits next to your booleans (usually
**inside a subgraph**), reads them in its own graph (always reliable), and
relays the result to the Group/Node Controllers that hold the real targets.

## Set it up

1. Inside a subgraph, drop your booleans (e.g. **Value on Boolean**, promoted
   subgraph-input booleans) and a **Wired Controller**.
2. Connect the Wired Controller to the Controllers it should drive, by **either**:
   - **Wire** - run its **`patch`** output across a subgraph output (IO) into
     each Controller's **`↦ patch`** input. One output can fan out to many
     Controllers (Group *and* Node, mixed).
   - **Channel** - type a name in the Wired Controller's **`channel`** field and
     the same name in each Controller's **`channel`** field. No wire needed -
     works at any subgraph nesting depth.
3. **That's it - it fills itself in.** The Wired Controller reads the targets
   already on the Controllers it feeds and **auto-creates one `BOOLEAN` input
   per target**, labelled to match. Add/remove a target on a Controller and its
   inputs follow. Just wire your booleans into the inputs it grows.

## How it behaves

- A signal **governs** its target exactly like a directly-wired boolean:
  `true` = enabled, `false` = disabled (using that target's `↳ disable as` mode),
  and it **overrides** the master `ALL` toggle.
- A target's own direct `BOOLEAN` input, if also wired, wins for that one target.
- An input you leave unwired is ignored - that target stays on manual / `ALL`.

## Why use it instead of wiring a boolean straight in

Reading a boolean *across* a subgraph boundary is best-effort and can get
confused when several subgraphs are in play. The Wired Controller flips this to
the reliable side: it reads booleans in their own graph and delivers the result
in the safe direction (out of its subgraph, across, and down into the target's
subgraph). Result: a subgraph holds just *booleans + one Wired Controller*,
while the real targets stay on Controllers in the parent graph - one tidy box of
switches drives the whole pipeline.

> Tip: running two Wired Controllers? Give them distinct channel names so their
> signals don't merge.
