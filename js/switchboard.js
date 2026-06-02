import { app } from "../../scripts/app.js";

/**
 * Switchboard - Group / Node Controllers
 * ---------------------------------------
 * Client-side ("virtual") nodes, in the spirit of rgthree's Fast Group Bypasser
 * but more flexible. Two node types share one base:
 *
 *   - Group Controller -- targets are GROUPS (by title).
 *   - Node Controller  -- targets are individual NODES (by id).
 *
 * For each target you get an on/off toggle (drivable by a wired BOOLEAN input)
 * plus an independent "disable as" bypass/mute selector, a master broadcast
 * toggle, and add/remove dropdowns.
 *
 * Enabling/disabling a target just changes the *mode* of the underlying node(s)
 * -- a pure graph operation, applied immediately on change and again at queue
 * time via applyToGraph() so the prompt that runs matches what you see.
 */

// LiteGraph node modes.
const MODE_ALWAYS = 0; // active / enabled
const MODE_NEVER = 2; // muted
const MODE_BYPASS = 4; // bypassed (route around)

const CATEGORY = "🎛️ Switchboard";
const DISABLE_MODES = ["bypass", "mute"];
// Recognised values from an older single tri-state shape, kept for migration.
const GROUP_STATES = ["enabled", "bypass", "mute"];
const MODE_WIDGET_LABEL = "↳ disable as";

/** Resolve a control's LiteGraph node mode from its enabled flag + disable mode. */
function controlToMode(control) {
  if (control.enabled) return MODE_ALWAYS;
  return control.disableMode === "mute" ? MODE_NEVER : MODE_BYPASS;
}

// ---- group targets ---------------------------------------------------------

// NOTE: every helper takes the *node's own graph* (`this.graph`), not the root
// `app.graph`. A controller placed inside a subgraph must see that subgraph's
// groups/nodes/links -- using the root graph is what made subgraphs only list
// the outer graph's contents.

function getGraphGroups(graph) {
  if (!graph) return [];
  return graph._groups || graph.groups || [];
}

/** All group titles in `graph`, de-duplicated, as {key,label}. */
function getGroupChoices(graph) {
  const seen = new Set();
  const choices = [];
  for (const group of getGraphGroups(graph)) {
    if (group.title && !seen.has(group.title)) {
      seen.add(group.title);
      choices.push({ key: group.title, label: group.title });
    }
  }
  return choices;
}

/** Set the mode of every node inside `graph` groups whose title matches `key`. */
function applyModeToGroup(graph, key, mode) {
  for (const group of getGraphGroups(graph)) {
    if (group.title !== key) continue;
    // Make sure the group knows which nodes are inside its bounds.
    if (typeof group.recomputeInsideNodes === "function") {
      group.recomputeInsideNodes();
    }
    const nodes = group._nodes || group.nodes || [];
    for (const node of nodes) node.mode = mode;
  }
}

// ---- node targets ----------------------------------------------------------

function getGraphNodes(graph) {
  if (!graph) return [];
  return graph._nodes || graph.nodes || [];
}

/** Every targetable node in `graph` as {key:id, label:"id: Title"}, excluding
 *  `self` and any of our own controller nodes (you can't control a controller). */
function getNodeChoices(graph, self) {
  const choices = [];
  for (const node of getGraphNodes(graph)) {
    if (node === self) continue;
    if (node.constructor && node.constructor.isSwitchboardController) continue;
    const name = node.title || node.type || "node";
    choices.push({ key: String(node.id), label: `${node.id}: ${name}` });
  }
  return choices;
}

/** Set the mode of the `graph` node whose id matches `key`. Handles both numeric
 *  ids (classic graphs) and string ids (e.g. subgraph nodes under Nodes 2.0). */
function applyModeToNode(graph, key, mode) {
  if (!graph || !graph.getNodeById) return;
  let node = graph.getNodeById(key);
  if (!node && /^\d+$/.test(key)) node = graph.getNodeById(Number(key));
  if (node) node.mode = mode;
}

/**
 * Shared base. Subclasses provide three things via static/overridable members:
 *   - static targetWord          ("group" | "node") for placeholder text
 *   - _allChoices()  -> [{key,label}] of everything targetable right now
 *   - _applyTo(key, mode)        applies a LiteGraph mode to that target
 */
class BaseControllerNode extends LGraphNode {
  constructor(title) {
    super(title);

    // Virtual: never sent to the server as an executable node.
    this.isVirtualNode = true;
    // All state lives in `this.properties` (serialized automatically). Widgets
    // are rebuilt from properties on load, so don't also persist widget values.
    this.serialize_widgets = false;

    if (!this.properties) this.properties = {};
    // controls: array of { key, label, enabled: bool, disableMode: bypass|mute }
    if (!this.properties.controls) this.properties.controls = [];
    this._normalizeControls();

    this.size = [260, 120];
    this._buildWidgets();
  }

  get _addPlaceholder() {
    return `➕ Add ${this.constructor.targetWord}…`;
  }

  get _removePlaceholder() {
    return `➖ Remove ${this.constructor.targetWord}…`;
  }

  /** The graph this controller lives in -- the subgraph when nested, otherwise
   *  the root graph. Everything operates on this, never the root `app.graph`. */
  _graph() {
    return this.graph || app.graph;
  }

  // ---- overridable target hooks (defaults are inert) -----------------------

  _allChoices() {
    return [];
  }

  _applyTo(_key, _mode) {}

  // ---- migration / setup ---------------------------------------------------

  /** Backfill defaults and migrate older shapes so saved workflows keep working.
   *  Target shape: { key, label, enabled, disableMode }. */
  _normalizeControls() {
    for (const c of this.properties.controls) {
      // Old Group Controller shape used `title` for both key and label.
      if (c.key == null && c.title != null) c.key = c.title;
      if (c.label == null) c.label = c.title != null ? c.title : c.key;
      if (!DISABLE_MODES.includes(c.disableMode)) c.disableMode = "bypass";
      if (typeof c.enabled !== "boolean") {
        // Migrate from the single tri-state { state } shape.
        if (GROUP_STATES.includes(c.state)) {
          c.enabled = c.state === "enabled";
          if (c.state !== "enabled") c.disableMode = c.state;
        } else {
          c.enabled = true;
        }
      }
      delete c.state;
      delete c.title;
    }
  }

  _availableChoices() {
    const used = new Set(this.properties.controls.map((c) => c.key));
    return this._allChoices().filter((choice) => !used.has(choice.key));
  }

  // ---- widget construction -------------------------------------------------

  _buildWidgets() {
    this.widgets = [];

    // 1) Master broadcast: clicking it forces every target on/off. It does NOT
    //    track individual or boolean-driven changes -- it's an action switch.
    //    When disabling, each target uses its own bypass/mute mode.
    this.addWidget(
      "toggle",
      "ALL",
      this._allEnabled(),
      (value) => {
        for (const control of this.properties.controls) {
          // A connected boolean governs its target -- the master broadcast (and
          // manual toggling) is overridden by it, so skip those here.
          if (this._hasBooleanInput(control)) continue;
          control.enabled = value;
        }
        this._syncToggles();
        this.applyAll();
      },
      { on: "enabled", off: "disabled" },
    );

    // 2) Per target: on/off toggle (boolean-driven) + independent "disable as".
    for (const control of this.properties.controls) {
      this._addControlWidgets(control);
    }

    // 3) "Add" combo -- lists targets not yet controlled.
    this.addWidget(
      "combo",
      "add",
      this._addPlaceholder,
      (value) => {
        const choice = this._availableChoices().find((c) => c.label === value);
        if (choice) this.addTarget(choice.key, choice.label);
      },
      { values: () => [this._addPlaceholder, ...this._availableChoices().map((c) => c.label)] },
    );

    // 4) "Remove" combo -- only when there's something to remove.
    if (this.properties.controls.length) {
      this.addWidget(
        "combo",
        "remove",
        this._removePlaceholder,
        (value) => {
          const control = this.properties.controls.find((c) => c.label === value);
          if (control) this.removeTarget(control.key);
        },
        { values: () => [this._removePlaceholder, ...this.properties.controls.map((c) => c.label)] },
      );
    }

    this._refreshAddWidget();
    this._syncInputs();
    this.setDirtyCanvas(true, true);
  }

  _addControlWidgets(control) {
    // On/off toggle -- this is what a wired BOOLEAN input drives.
    const toggle = this.addWidget(
      "toggle",
      control.label,
      control.enabled,
      (value) => {
        control.enabled = value;
        this.applyControl(control);
      },
      { on: "enabled", off: "disabled" },
    );
    toggle._controlKey = control.key;

    // Independent "disable as" selector -- stays editable even while a boolean
    // holds the target enabled, so you can pre-set bypass vs mute per target.
    this.addWidget(
      "combo",
      MODE_WIDGET_LABEL,
      control.disableMode,
      (value) => {
        control.disableMode = value;
        this.applyControl(control); // re-applies immediately if currently disabled
      },
      { values: DISABLE_MODES },
    );
  }

  // ---- helpers -------------------------------------------------------------

  _allEnabled() {
    const controls = this.properties.controls;
    return controls.length > 0 && controls.every((c) => c.enabled);
  }

  _syncToggles() {
    // Only the on/off toggles mirror state; the "disable as" combos are
    // user-owned and never driven by inputs, so they're left alone.
    for (const control of this.properties.controls) {
      const widget = this.widgets?.find((w) => w._controlKey === control.key);
      if (widget) widget.value = control.enabled;
    }
  }

  _refreshAddWidget() {
    const addWidget = this.widgets?.find((w) => w.name === "add");
    if (addWidget) addWidget.value = this._addPlaceholder;
  }

  // ---- boolean inputs ------------------------------------------------------

  /** Ensure exactly one BOOLEAN input per control, matched by label. Reconciles
   *  by name so existing slots (and their links) survive reload. */
  _syncInputs() {
    const wanted = this.properties.controls.map((c) => c.label);
    for (let i = (this.inputs?.length || 0) - 1; i >= 0; i--) {
      if (!wanted.includes(this.inputs[i].name)) this.removeInput(i);
    }
    for (const label of wanted) {
      if (this.findInputSlot(label) === -1) this.addInput(label, "BOOLEAN");
    }
  }

  /** Read the boolean coming into `slot` from the connected upstream node.
   *  Returns true/false, or null if nothing usable is connected. */
  _readBooleanInput(slot) {
    const input = this.inputs?.[slot];
    if (!input || input.link == null) return null;
    const graph = this._graph();
    const link = graph.links[input.link];
    if (!link) return null;
    const origin = graph.getNodeById(link.origin_id);
    if (!origin) return null;
    // Primitive/Boolean nodes hold their value in a widget (a constant set in
    // the UI), which we can read directly on the front-end.
    const widgets = origin.widgets || [];
    let w = widgets.find((x) => typeof x.value === "boolean");
    if (!w) w = widgets.find((x) => /^(value|boolean|bool)$/i.test(x.name || ""));
    if (w) return !!w.value;
    // Fall back to a cached output value if the node exposes one.
    const out = origin.outputs?.[link.origin_slot];
    if (out && typeof out._data !== "undefined") return !!out._data;
    return null;
  }

  /** True when this control has a BOOLEAN wired in -- i.e. it's governed by the
   *  input and should ignore the master broadcast / manual toggling. */
  _hasBooleanInput(control) {
    const slot = this.findInputSlot(control.label);
    if (slot === -1) return false;
    const input = this.inputs?.[slot];
    return !!(input && input.link != null);
  }

  /** Pull every connected boolean input into its control's enabled state. */
  _refreshFromInputs() {
    let changed = false;
    for (const control of this.properties.controls) {
      const slot = this.findInputSlot(control.label);
      if (slot === -1) continue;
      const value = this._readBooleanInput(slot);
      if (value === null) continue; // not wired -> leave manual toggle alone
      // The boolean drives only on/off; the target keeps its own disable mode.
      if (control.enabled !== value) {
        control.enabled = value;
        changed = true;
      }
    }
    if (changed) this._syncToggles();
    return changed;
  }

  _pollInputs() {
    if (this._refreshFromInputs()) {
      this.applyAll();
      this.setDirtyCanvas(true, true);
    }
  }

  // ---- public actions ------------------------------------------------------

  addTarget(key, label) {
    if (this.properties.controls.some((c) => c.key === key)) return;
    const control = { key, label, enabled: true, disableMode: "bypass" };
    this.properties.controls.push(control);
    // Rebuild so the toggle + disable-as combo, BOOLEAN input and "remove" combo
    // all appear at once. _buildWidgets() -> _syncInputs() adds the input slot.
    this._buildWidgets();
    this.applyControl(control);
    this.size[1] = Math.max(this.size[1], this.computeSize()[1]);
    this.setDirtyCanvas(true, true);
  }

  removeTarget(key) {
    const control = this.properties.controls.find((c) => c.key === key);
    this.properties.controls = this.properties.controls.filter((c) => c.key !== key);
    // Re-enable the target so removing the controller doesn't strand it disabled.
    if (control) this._applyTo(key, MODE_ALWAYS);
    this._buildWidgets();
  }

  applyControl(control) {
    this._applyTo(control.key, controlToMode(control));
    this.setDirtyCanvas(true, true);
  }

  applyAll() {
    for (const control of this.properties.controls) this.applyControl(control);
  }

  // ---- ComfyUI / LiteGraph hooks ------------------------------------------

  /** Called by ComfyUI during graphToPrompt (queue time). Re-reads any wired
   *  boolean inputs, then ensures the running graph matches the toggles. */
  applyToGraph() {
    this._refreshFromInputs();
    this.applyAll();
  }

  onAdded() {
    this.applyAll();
    // Live-track wired boolean inputs with a lightweight timer instead of a
    // canvas draw hook. Draw-based hooks (onDrawForeground) don't fire under the
    // Nodes 2.0 / Vue renderer; a timer works in both the legacy canvas and Vue.
    if (!this._pollTimer) {
      this._pollTimer = setInterval(() => this._pollInputs(), 200);
    }
  }

  onRemoved() {
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
  }

  onConfigure() {
    if (!this.properties.controls) this.properties.controls = [];
    this._normalizeControls();
    this._buildWidgets();
    // Defer applying until the rest of the graph (groups/nodes) exists.
    setTimeout(() => {
      this._refreshFromInputs();
      this.applyAll();
    }, 0);
  }

  /** Connecting/disconnecting a boolean input takes effect immediately. */
  onConnectionsChange(type) {
    if (type === LiteGraph.INPUT) this._pollInputs();
  }

  getExtraMenuOptions(_, options) {
    // IMPORTANT: push into `options` and DO NOT return it. ComfyUI's LiteGraph
    // does `options = extra.concat(options)` when this returns truthy -- returning
    // the mutated array would duplicate the ENTIRE context menu.
    const word = this.constructor.targetWord;
    if (this.properties.controls.length) {
      options.push({
        content: `Remove controlled ${word}`,
        has_submenu: true,
        submenu: {
          options: this.properties.controls.map((c) => ({
            content: c.label,
            callback: () => this.removeTarget(c.key),
          })),
        },
      });
    }
    options.push({
      content: `Refresh ${word} list`,
      callback: () => this._buildWidgets(),
    });
  }
}

// ---- concrete controllers --------------------------------------------------

class GroupControllerNode extends BaseControllerNode {
  static targetWord = "group";
  static isSwitchboardController = true;

  constructor(title = GroupControllerNode.nodeTitle) {
    super(title);
  }

  _allChoices() {
    return getGroupChoices(this._graph());
  }

  _applyTo(key, mode) {
    applyModeToGroup(this._graph(), key, mode);
  }
}
GroupControllerNode.nodeTitle = "Group Controller";

class NodeControllerNode extends BaseControllerNode {
  static targetWord = "node";
  static isSwitchboardController = true;

  constructor(title = NodeControllerNode.nodeTitle) {
    super(title);
  }

  _allChoices() {
    return getNodeChoices(this._graph(), this);
  }

  _applyTo(key, mode) {
    applyModeToNode(this._graph(), key, mode);
  }
}
NodeControllerNode.nodeTitle = "Node Controller";

app.registerExtension({
  name: "Switchboard.Controllers",
  registerCustomNodes() {
    for (const Cls of [GroupControllerNode, NodeControllerNode]) {
      Cls.title = Cls.nodeTitle;
      Cls.collapsable = true;
      LiteGraph.registerNodeType(Cls.nodeTitle, Cls);
      Cls.category = CATEGORY;
    }
  },
});
