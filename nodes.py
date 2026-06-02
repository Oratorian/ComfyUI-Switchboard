"""Backend utility nodes for Switchboard.

Unlike the Group/Node Controllers (which are client-side and only toggle node
*modes*), these are real executing nodes that move data at runtime:

- Value On Boolean: pick one of two numbers from a boolean.
- Boolean Switch:    route one of two inputs through, based on a boolean,
                     evaluating ONLY the chosen branch (lazy) -- the unused
                     input's whole upstream chain is skipped.
"""

CATEGORY = "🎛️ Switchboard"


class _AnyType(str):
    """A type string that compares equal to every other type, so a ``*`` socket
    accepts a connection of any kind. The standard ComfyUI wildcard trick."""

    def __eq__(self, _other):
        return True

    def __ne__(self, _other):
        return False

    def __hash__(self):
        return hash("*")


ANY = _AnyType("*")


class SwitchboardValueOnBoolean:
    """Output one of two values depending on a boolean."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "boolean": ("BOOLEAN", {"default": True}),
                "value_if_true": (
                    "FLOAT",
                    {"default": 1.0, "min": -1.0e9, "max": 1.0e9, "step": 0.01},
                ),
                "value_if_false": (
                    "FLOAT",
                    {"default": 0.0, "min": -1.0e9, "max": 1.0e9, "step": 0.01},
                ),
            }
        }

    RETURN_TYPES = ("FLOAT", "INT", "STRING", "BOOLEAN")
    RETURN_NAMES = ("float", "int", "string", "boolean")
    FUNCTION = "run"
    CATEGORY = CATEGORY
    DESCRIPTION = "Pick value_if_true or value_if_false based on a boolean. " \
        "The chosen number is returned as FLOAT/INT/STRING; the boolean passes through."

    def run(self, boolean, value_if_true, value_if_false):
        value = value_if_true if boolean else value_if_false
        return (float(value), int(round(value)), str(value), bool(boolean))


class SwitchboardBooleanSwitch:
    """Route one of two inputs (any type) based on a boolean, lazily."""

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                # An input socket, not a widget toggle -- wire a BOOLEAN in.
                "boolean": ("BOOLEAN", {"forceInput": True}),
            },
            "optional": {
                # Lazy: only the selected branch is ever evaluated.
                "on_true": (ANY, {"lazy": True}),
                "on_false": (ANY, {"lazy": True}),
            },
        }

    RETURN_TYPES = (ANY,)
    RETURN_NAMES = ("output",)
    FUNCTION = "run"
    CATEGORY = CATEGORY
    DESCRIPTION = "Pass on_true through when boolean is True, otherwise on_false. " \
        "Accepts any type, and only the selected branch is executed (lazy)."

    def check_lazy_status(self, boolean, on_true=None, on_false=None):
        # Tell ComfyUI which lazy input we actually need so the other branch's
        # upstream graph is never executed.
        return ["on_true"] if boolean else ["on_false"]

    def run(self, boolean, on_true=None, on_false=None):
        return (on_true if boolean else on_false,)


NODE_CLASS_MAPPINGS = {
    "SwitchboardValueOnBoolean": SwitchboardValueOnBoolean,
    "SwitchboardBooleanSwitch": SwitchboardBooleanSwitch,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SwitchboardValueOnBoolean": "Value on Boolean",
    "SwitchboardBooleanSwitch": "Boolean Switch",
}
