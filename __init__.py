"""Switchboard - advanced group/node enable/disable controllers for ComfyUI.

The actual nodes (Group Controller, Node Controller) are client-side ("virtual")
LiteGraph nodes implemented in ``js/switchboard.js``. They never execute on the
server, so there are no Python node classes here -- we only need to expose the
web directory so ComfyUI serves the JavaScript extension.
"""

# No server-side nodes: everything happens in the browser graph.
NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}

# Tell ComfyUI where to find the front-end extension(s).
WEB_DIRECTORY = "./js"

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
