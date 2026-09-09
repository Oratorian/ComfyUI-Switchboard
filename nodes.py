"""Backend utility nodes for Switchboard.

Unlike the Group/Node Controllers (which are client-side and only toggle node
*modes*), these are real executing nodes that move data at runtime:

- Value On Boolean: pick one of two numbers from a boolean.
- Boolean Switch:    route one of two inputs through, based on a boolean,
                     evaluating ONLY the chosen branch (lazy) -- the unused
                     input's whole upstream chain is skipped.

Written against the V3 node schema (``comfy_api.latest``). The node ids and
socket names below are load-bearing: they're what saved workflows reference, so
they match the V1 versions these replaced exactly.
"""

from typing_extensions import override

from comfy_api.latest import ComfyExtension, io

CATEGORY = "🎛️ Switchboard"


class SwitchboardValueOnBoolean(io.ComfyNode):
    """Output one of two values depending on a boolean."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="SwitchboardValueOnBoolean",
            display_name="Value on Boolean",
            category=CATEGORY,
            description="Pick value_if_true or value_if_false based on a boolean. "
            "The chosen number is returned as FLOAT/INT/STRING; the boolean passes through.",
            inputs=[
                io.Boolean.Input("boolean", default=True),
                io.Float.Input(
                    "value_if_true", default=1.0, min=-1.0e9, max=1.0e9, step=0.01
                ),
                io.Float.Input(
                    "value_if_false", default=0.0, min=-1.0e9, max=1.0e9, step=0.01
                ),
            ],
            outputs=[
                io.Float.Output(display_name="float"),
                io.Int.Output(display_name="int"),
                io.String.Output(display_name="string"),
                io.Boolean.Output(display_name="boolean"),
            ],
        )

    @classmethod
    def execute(cls, boolean, value_if_true, value_if_false) -> io.NodeOutput:
        value = value_if_true if boolean else value_if_false
        return io.NodeOutput(float(value), int(round(value)), str(value), bool(boolean))


class SwitchboardBooleanSwitch(io.ComfyNode):
    """Route one of two inputs (any type) based on a boolean, lazily."""

    @classmethod
    def define_schema(cls) -> io.Schema:
        return io.Schema(
            node_id="SwitchboardBooleanSwitch",
            display_name="Boolean Switch",
            category=CATEGORY,
            description="Pass on_true through when boolean is True, otherwise on_false. "
            "Accepts any type, and only the selected branch is executed (lazy).",
            inputs=[
                # An input socket, not a widget toggle -- wire a BOOLEAN in.
                io.Boolean.Input("boolean", force_input=True),
                # Lazy: only the selected branch is ever evaluated.
                io.AnyType.Input("on_true", optional=True, lazy=True),
                io.AnyType.Input("on_false", optional=True, lazy=True),
            ],
            outputs=[
                io.AnyType.Output(display_name="output"),
            ],
        )

    @classmethod
    def check_lazy_status(cls, boolean, on_true=None, on_false=None) -> list[str]:
        # Tell ComfyUI which lazy input we actually need so the other branch's
        # upstream graph is never executed.
        if boolean and on_true is None:
            return ["on_true"]
        if not boolean and on_false is None:
            return ["on_false"]
        return []

    @classmethod
    def execute(cls, boolean, on_true=None, on_false=None) -> io.NodeOutput:
        return io.NodeOutput(on_true if boolean else on_false)


class SwitchboardExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[io.ComfyNode]]:
        return [
            SwitchboardValueOnBoolean,
            SwitchboardBooleanSwitch,
        ]


async def comfy_entrypoint() -> SwitchboardExtension:
    return SwitchboardExtension()
