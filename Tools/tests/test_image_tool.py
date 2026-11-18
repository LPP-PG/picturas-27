"""Shared worker of the PIL image tools (utils/image_tool.py).

The tests use the real ToolMSG with the RabbitMQ connection replaced, so they
check the JSON message each tool sends back to the projects service.
"""
import datetime
import json

import pytest
from PIL import Image

from utils import filters
from utils.image_tool import WRONG_PROCEDURE, ImageTool
from utils.tool_msg import ToolMSG

# Parameters as the frontend sends them, and the error codes of each tool
TOOLS = {
    "brightness": ({"brightness": 1.4}, (1900, 1901)),
    "contrast": ({"contrastFactor": 0.6}, (1300, 1301)),
    "saturation": ({"saturationFactor": 1.8}, (1700, 1701)),
    "rotate": ({"degrees": 33}, (1600, 1601)),
    "resize": ({"width": 30, "height": 20}, (1500, 1501)),
    "binarization": ({"threshold": 120}, (1100, 1101)),
    "cut": ({"left": 5, "top": 4, "right": 10, "bottom": 6}, (1500, 1501)),
    "border": ({"borderWidth": 3, "r": 10, "g": 200, "b": 30}, (1200, 1201)),
}


class FakeRabbit:
    def __init__(self):
        self.sent = []

    def send_rabbit_msg(self, msg, queue):
        self.sent.append((queue, json.loads(msg)))


def make_tool(procedure):
    msg = ToolMSG.__new__(ToolMSG)
    msg._microservice_name = f"picturas-{procedure}-tool-ms"
    msg._queue = ToolMSG.queues[procedure]
    msg._proj_queue = ToolMSG.queues["project"]
    msg._rabbit_mq = FakeRabbit()
    return ImageTool(procedure, TOOLS[procedure][1], tool_msg=msg), msg._rabbit_mq


@pytest.fixture
def image(tmp_path):
    path = tmp_path / "in.png"
    img = Image.new("RGB", (60, 40))
    img.putdata([((x * 7) % 256, (x * 13) % 256, (x * 29) % 256) for x in range(60 * 40)])
    img.save(path)
    return path


def request(procedure, params, input_path, output_path, msg_id="request-1"):
    return json.dumps({
        "messageId": msg_id,
        "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "procedure": procedure,
        "parameters": {"inputImageURI": str(input_path),
                       "outputImageURI": str(output_path), **params},
    }).encode()


@pytest.mark.parametrize("procedure", sorted(TOOLS))
def test_applies_the_shared_filter_and_replies_success(procedure, image, tmp_path):
    tool, rabbit = make_tool(procedure)
    params = TOOLS[procedure][0]
    output = tmp_path / "out.png"

    tool.callback(None, None, None, request(procedure, params, image, output))

    expected = filters.FILTERS[procedure](Image.open(image), **params)
    result = Image.open(output)
    assert (result.mode, result.size) == (expected.mode, expected.size)
    assert result.tobytes() == expected.tobytes()

    [(queue, reply)] = rabbit.sent
    assert queue == "project_queue"
    assert reply["status"] == "success"
    assert reply["correlationId"] == "request-1"
    assert reply["messageId"] == f"{procedure}-0-request-1"
    assert reply["output"] == {"type": "image", "imageURI": str(output)}
    assert reply["metadata"]["microservice"] == f"picturas-{procedure}-tool-ms"
    assert reply["metadata"]["processingTime"] >= 0


@pytest.mark.parametrize("procedure", sorted(TOOLS))
def test_wrong_procedure_is_reported_without_processing(procedure, image, tmp_path):
    tool, rabbit = make_tool(procedure)
    output = tmp_path / "out.png"

    tool.callback(None, None, None, request("other", TOOLS[procedure][0], image, output))

    assert not output.exists()
    [(_, reply)] = rabbit.sent
    assert reply["status"] == "error"
    assert reply["error"]["code"] == TOOLS[procedure][1][0]
    assert reply["error"]["message"] == WRONG_PROCEDURE
    assert reply["error"]["details"] == {"inputFileURI": str(image)}


def test_processing_failure_is_reported_and_the_tool_keeps_running(image, tmp_path):
    tool, rabbit = make_tool("cut")
    margins_too_large = {"left": 40, "top": 0, "right": 40, "bottom": 0}

    tool.callback(None, None, None, request("cut", margins_too_large, image, tmp_path / "a.png"))
    tool.callback(None, None, None, request("cut", TOOLS["cut"][0], image, tmp_path / "b.png", "request-2"))

    first, second = (reply for _, reply in rabbit.sent)
    assert first["status"] == "error"
    assert first["error"]["code"] == 1501
    assert first["error"]["message"]
    assert second["status"] == "success"
    assert second["messageId"] == "cut-1-request-2"


def test_missing_parameter_is_a_processing_error(image, tmp_path):
    tool, rabbit = make_tool("resize")

    tool.callback(None, None, None, request("resize", {"width": 10}, image, tmp_path / "out.png"))

    [(_, reply)] = rabbit.sent
    assert reply["status"] == "error"
    assert reply["error"]["code"] == 1501


def test_missing_input_file_is_a_processing_error(tmp_path):
    tool, rabbit = make_tool("brightness")

    tool.callback(None, None, None, request("brightness", {"brightness": 1.2},
                                            tmp_path / "missing.png", tmp_path / "out.png"))

    [(_, reply)] = rabbit.sent
    assert reply["error"]["code"] == 1901


def test_invalid_message_is_discarded_without_reply():
    tool, rabbit = make_tool("rotate")

    tool.callback(None, None, None, b"not json")
    tool.callback(None, None, None, json.dumps({"messageId": "x"}).encode())

    assert rabbit.sent == []
