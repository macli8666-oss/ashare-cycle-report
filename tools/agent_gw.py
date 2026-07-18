"""Local compatibility shim for the agent-gw Python SDK.

The official agent-gw pysdk lives on an internal Git host that is not
reachable from this machine. The Wind / Gildata plugin scripts only use a
tiny slice of the SDK surface:

    with AgentGwClient(api_key=..., base_url=..., timeout=...) as client:
        resp = client.tools.get_data_source_desc({"name": "wind"})
        resp.text
        resp2 = client.tools.call_data_source_tool(payload)
        resp2.raw

This module implements exactly that surface over plain HTTP, mirroring the
transport logic of the bundled gildata_tool.py (POST {base_url}/v1/tools with
{"method": ..., "params": ...}, Bearer auth, SSE-tolerant JSON parsing).
"""

from __future__ import annotations

import json
from typing import Any, Dict
from urllib import error, request

__version__ = "0.1.0-local-shim"

_TOOLS_PATH = "/v1/tools"


class AgentGwError(Exception):
    """Raised for transport or gateway-level failures."""


class _ToolsResponse:
    """Mimics the SDK response objects used by the plugin scripts."""

    def __init__(self, raw: Dict[str, Any]):
        self.raw = raw
        self.text = _render_text(raw)


def _render_text(raw: Dict[str, Any]) -> str:
    for key in ("text", "markdown", "description", "data", "result"):
        value = raw.get(key)
        if isinstance(value, str) and value.strip():
            return value
    return json.dumps(raw, ensure_ascii=False, indent=2)


def _parse_sse_json(text: str) -> Any:
    data_lines = [
        line[len("data:"):].strip()
        for line in text.splitlines()
        if line.strip().startswith("data:")
    ]
    if not data_lines:
        return None
    candidates = ["\n".join(data_lines), *reversed(data_lines)]
    for cand in candidates:
        if not cand or cand == "[DONE]":
            continue
        try:
            parsed = json.loads(cand)
        except ValueError:
            continue
        if isinstance(parsed, dict):
            return parsed
    return None


class _ToolsNamespace:
    def __init__(self, client: "AgentGwClient"):
        self._client = client

    def get_data_source_desc(self, params: Dict[str, Any]) -> _ToolsResponse:
        raw = self._client._tools_request("get_data_source_desc", params)
        return _ToolsResponse(raw)

    def call_data_source_tool(self, params: Dict[str, Any]) -> _ToolsResponse:
        raw = self._client._tools_request("call_data_source_tool", params)
        return _ToolsResponse(raw)


class AgentGwClient:
    def __init__(self, api_key: str, base_url: str, timeout: float = 60.0, **_ignored: Any):
        if not api_key:
            raise AgentGwError("Missing api_key for AgentGwClient")
        self._api_key = api_key
        self._base_url = str(base_url).rstrip("/")
        self._timeout = float(timeout)
        self.tools = _ToolsNamespace(self)

    def __enter__(self) -> "AgentGwClient":
        return self

    def __exit__(self, *exc_info: Any) -> None:
        return None

    def close(self) -> None:
        return None

    def _tools_request(self, method: str, params: Dict[str, Any]) -> Dict[str, Any]:
        url = f"{self._base_url}{_TOOLS_PATH}"
        body = json.dumps({"method": method, "params": params}).encode("utf-8")
        req = request.Request(
            url,
            data=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {self._api_key}",
            },
            method="POST",
        )
        try:
            with request.urlopen(req, timeout=self._timeout) as response:
                status = getattr(response, "status", response.getcode())
                text = response.read().decode("utf-8")
        except error.HTTPError as exc:
            snippet = exc.read().decode("utf-8", errors="replace").strip().replace("\n", " ")[:300]
            raise AgentGwError(f"HTTP {exc.code} returned error body: {snippet or '<empty>'}") from exc
        except error.URLError as exc:
            raise AgentGwError(f"Network request failed: {exc.reason}") from exc

        try:
            raw = json.loads(text)
        except ValueError:
            raw = _parse_sse_json(text)
        if not isinstance(raw, dict):
            snippet = text.strip().replace("\n", " ")[:300]
            raise AgentGwError(f"HTTP {status} returned non-object JSON payload: {snippet or '<empty>'}")
        return raw
