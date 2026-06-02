"""Switchboard - advanced group/node controllers + boolean utilities for ComfyUI.

Two kinds of nodes ship here:

- **Group Controller / Node Controller** - client-side ("virtual") LiteGraph
  nodes in ``js/switchboard.js``. They never execute on the server; they just
  toggle node modes (active/bypass/mute) in the browser graph.
- **Value on Boolean / Boolean Switch** - real backend nodes in ``nodes.py``
  that move data at runtime, so users get boolean->value and conditional
  routing without needing a separate custom-node pack.
"""

from .nodes import NODE_CLASS_MAPPINGS, NODE_DISPLAY_NAME_MAPPINGS

# Tell ComfyUI where to find the front-end extension(s).
WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
