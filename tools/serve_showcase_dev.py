#!/usr/bin/env python3
"""Serve the portfolio with a narrow local-only Showcase config write endpoint."""

from __future__ import annotations

import argparse
import ipaddress
import json
import math
import os
import re
from copy import deepcopy
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Any
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
CONFIG_PATH = ROOT / "data" / "showcase-config.json"
ENDPOINT = "/__dev/showcase-config"
MAX_BODY_BYTES = 32_768
CURRENT_VERSION = 2
GROUPS = ("layout", "node", "hub", "line", "motion", "effects")
NODE_PLACEMENT_COUNT = 7
HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")

ALLOWED_BIND_HOSTS = {"127.0.0.1", "localhost", "::1"}
ALLOWED_HOSTNAMES = {"127.0.0.1", "localhost", "::1"}

DESCRIPTORS: dict[str, dict[str, dict[str, Any]]] = {
    "layout": {
        "desktopDistanceScale": {"min": 0.7, "max": 1.4},
        "mobileDistanceScale": {"min": 0.7, "max": 1.35},
        "hubXRatio": {"min": 0.25, "max": 0.75},
        "hubYOffsetRatio": {"min": 0.05, "max": 0.45},
        "mobileHubYRatio": {"min": 0.08, "max": 0.35},
        "viewportMargin": {"min": 0, "max": 80},
        "collisionGap": {"min": 0, "max": 48},
        "lineBend": {"min": -80, "max": 80},
        "lineEndpointGap": {"min": 0, "max": 24},
    },
    "node": {
        "desktopWidth": {"min": 160, "max": 320},
        "desktopHeight": {"min": 64, "max": 140},
        "mobileWidth": {"min": 120, "max": 220},
        "mobileHeight": {"min": 48, "max": 96},
        "backgroundOpacity": {"min": 0, "max": 1},
        "hoverBackgroundOpacity": {"min": 0, "max": 1},
        "borderWidth": {"min": 0, "max": 4},
        "borderOpacity": {"min": 0, "max": 1},
        "borderRadius": {"min": 0, "max": 32},
    },
    "hub": {
        "desktopWidth": {"min": 80, "max": 200},
        "desktopHeight": {"min": 40, "max": 120},
        "mobileWidth": {"min": 72, "max": 150},
        "mobileHeight": {"min": 34, "max": 80},
    },
    "line": {
        "width": {"min": 0.5, "max": 6},
        "activeWidth": {"min": 0.5, "max": 8},
        "opacity": {"min": 0, "max": 1},
        "bendDirection": {
            "options": {"alternating", "clockwise", "counterclockwise"}
        },
        "gradientEnabled": {"type": "boolean"},
        "startColor": {"type": "color"},
        "middleColor": {"type": "color"},
        "endColor": {"type": "color"},
        "middleStop": {"min": 0.1, "max": 0.9},
        "glowBlur": {"min": 0, "max": 18},
        "glowOpacity": {"min": 0, "max": 1},
    },
    "motion": {
        "hubTravelDuration": {"min": 80, "max": 1500},
        "hubCollapseDuration": {"min": 80, "max": 1500},
        "hubArcStrength": {"min": 0, "max": 0.6},
        "hubArcDirection": {"options": {-1, 1}},
        "hubArcMin": {"min": 0, "max": 240},
        "hubArcMax": {"min": 0, "max": 400},
        "webDeployDuration": {"min": 60, "max": 1200},
        "webDeployStagger": {"min": 0, "max": 200},
        "nodeRevealDelay": {"min": 0, "max": 1000},
        "nodeRevealDuration": {"min": 50, "max": 1200},
        "pointerStrength": {"min": 0.01, "max": 0.5},
        "pointerDamping": {"min": 0, "max": 0.98},
        "pointerRadius": {"min": 100, "max": 1200},
        "pointerInfluence": {"min": 0, "max": 80},
        "settleDistance": {"min": 0.05, "max": 5},
        "settleVelocity": {"min": 0.01, "max": 2},
        "easing": {"options": {"linear", "easeOutCubic", "easeInOutCubic"}},
    },
    "effects": {
        "nodeShadowBlur": {"min": 20, "max": 100},
        "nodeShadowOpacity": {"min": 0, "max": 1},
        "nodeGlowBlur": {"min": 0, "max": 60},
        "nodeGlowOpacity": {"min": 0, "max": 0.5},
        "hubShadowBlur": {"min": 20, "max": 120},
        "hubShadowOpacity": {"min": 0, "max": 1},
        "hubGlowBlur": {"min": 0, "max": 80},
        "hubGlowOpacity": {"min": 0, "max": 0.5},
    },
}

LINE_V2_DEFAULTS = {
    "bendDirection": "alternating",
    "gradientEnabled": True,
    "startColor": "#6ff8ff",
    "middleColor": "#9fa7ff",
    "endColor": "#c77dff",
    "middleStop": 0.54,
    "glowBlur": 7,
    "glowOpacity": 0.3,
}

EFFECT_DEFAULTS = {
    "nodeShadowBlur": 66,
    "nodeShadowOpacity": 0.52,
    "nodeGlowBlur": 30,
    "nodeGlowOpacity": 0.09,
    "hubShadowBlur": 76,
    "hubShadowOpacity": 0.42,
    "hubGlowBlur": 46,
    "hubGlowOpacity": 0.2,
}

WEB_OVERRIDE_DESCRIPTORS: dict[str, dict[str, Any]] = {
    "bend": {"min": -80, "max": 80},
    "bendDirection": {"options": {-1, 1}},
    "gradientEnabled": {"type": "boolean"},
    "startColor": {"type": "color"},
    "middleColor": {"type": "color"},
    "endColor": {"type": "color"},
    "middleStop": {"min": 0.1, "max": 0.9},
    "width": {"min": 0.5, "max": 6},
    "activeWidth": {"min": 0.5, "max": 8},
    "opacity": {"min": 0, "max": 1},
    "glowBlur": {"min": 0, "max": 18},
    "glowOpacity": {"min": 0, "max": 1},
}


def json_response(
    handler: SimpleHTTPRequestHandler,
    status: int,
    payload: dict[str, Any],
) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.send_header("Cache-Control", "no-store")
    handler.end_headers()
    handler.wfile.write(body)


def reject(message: str) -> ValueError:
    return ValueError(message)


def normalize_hostname(hostname: str | None) -> str | None:
    """Normalize a hostname for comparisons without performing DNS resolution."""
    if hostname is None:
        return None

    normalized = hostname.strip().lower()

    # urlparse().hostname removes IPv6 brackets. Strip one trailing DNS dot so
    # localhost. is treated the same as localhost.
    if normalized.endswith("."):
        normalized = normalized[:-1]

    return normalized


def is_loopback_hostname(hostname: str | None) -> bool:
    """Return whether a Host or Origin hostname is explicitly local."""
    normalized = normalize_hostname(hostname)

    if normalized in ALLOWED_HOSTNAMES:
        return True

    if normalized is None:
        return False

    # This also recognizes equivalent loopback IP spellings while avoiding DNS.
    try:
        return ipaddress.ip_address(normalized).is_loopback
    except ValueError:
        return False


def parse_host_header(host_header: str) -> tuple[str, int | None]:
    """Parse an HTTP Host header without treating it as a path."""
    if not host_header or any(character.isspace() for character in host_header):
        raise reject("Host header is missing or invalid.")

    parsed = urlparse(f"//{host_header}")

    if (
        parsed.username is not None
        or parsed.password is not None
        or parsed.path not in ("", "/")
        or parsed.params
        or parsed.query
        or parsed.fragment
    ):
        raise reject("Host header is invalid.")

    hostname = normalize_hostname(parsed.hostname)
    if hostname is None:
        raise reject("Host header is invalid.")

    try:
        port = parsed.port
    except ValueError as error:
        raise reject("Host header contains an invalid port.") from error

    return hostname, port


def effective_origin_port(scheme: str, explicit_port: int | None) -> int | None:
    if explicit_port is not None:
        return explicit_port
    if scheme == "http":
        return 80
    if scheme == "https":
        return 443
    return None


def validate_descriptor_value(value: Any, descriptor: dict[str, Any], path: str) -> None:
    if descriptor.get("type") == "boolean":
        if not isinstance(value, bool):
            raise reject(f"{path} must be a boolean.")
        return
    if descriptor.get("type") == "color":
        if not isinstance(value, str) or not HEX_COLOR_PATTERN.fullmatch(value):
            raise reject(f"{path} must be a six-digit hex color.")
        return
    if "options" in descriptor:
        if value not in descriptor["options"]:
            raise reject(f"{path} is not an allowed value.")
        return
    if (
        not isinstance(value, (int, float))
        or isinstance(value, bool)
        or not math.isfinite(value)
        or not descriptor["min"] <= value <= descriptor["max"]
    ):
        raise reject(f"{path} must be a finite number in range.")


def validate_placements(placements: Any) -> None:
    if not isinstance(placements, list) or len(placements) != NODE_PLACEMENT_COUNT:
        raise reject(
            f"nodePlacements must contain {NODE_PLACEMENT_COUNT} entries."
        )

    for index, placement in enumerate(placements, start=1):
        if not isinstance(placement, dict) or set(placement) != {"angle", "radius"}:
            raise reject(
                f"Node placement {index} must contain only angle and radius."
            )

        angle = placement["angle"]
        radius = placement["radius"]

        if (
            not isinstance(angle, (int, float))
            or isinstance(angle, bool)
            or not math.isfinite(angle)
            or not 0 <= angle <= 359
        ):
            raise reject(f"Node placement {index} angle is invalid.")

        if (
            not isinstance(radius, (int, float))
            or isinstance(radius, bool)
            or not math.isfinite(radius)
            or not 60 <= radius <= 320
        ):
            raise reject(f"Node placement {index} radius is invalid.")


def validate_snapshot(snapshot: Any) -> dict[str, Any]:
    if not isinstance(snapshot, dict) or set(snapshot) != {
        "config",
        "nodePlacements",
        "webs",
    }:
        raise reject("Payload must contain only config, nodePlacements, and webs.")

    config = snapshot["config"]
    if not isinstance(config, dict) or set(config) != set(GROUPS):
        raise reject("Config must contain exactly the expected groups.")

    for group in GROUPS:
        group_value = config[group]
        descriptors = DESCRIPTORS[group]
        if not isinstance(group_value, dict) or set(group_value) != set(descriptors):
            raise reject(f"Config group {group} has missing or extra keys.")
        for key, descriptor in descriptors.items():
            validate_descriptor_value(group_value[key], descriptor, f"{group}.{key}")

    validate_placements(snapshot["nodePlacements"])

    webs = snapshot["webs"]
    if not isinstance(webs, list) or len(webs) != NODE_PLACEMENT_COUNT:
        raise reject(f"webs must contain {NODE_PLACEMENT_COUNT} entries.")
    for index, web in enumerate(webs, start=1):
        if (
            not isinstance(web, dict)
            or set(web) != {"id", "overrides"}
            or web["id"] != f"node-{index}"
            or not isinstance(web["overrides"], dict)
        ):
            raise reject(f"Web {index} is malformed.")
        for key, value in web["overrides"].items():
            descriptor = WEB_OVERRIDE_DESCRIPTORS.get(key)
            if descriptor is None:
                raise reject(f"Web {index} override {key} is unsupported.")
            validate_descriptor_value(value, descriptor, f"webs.{index - 1}.overrides.{key}")

    return snapshot


def validate_v1_snapshot(snapshot: Any) -> dict[str, Any]:
    if not isinstance(snapshot, dict) or set(snapshot) != {"config", "nodePlacements"}:
        raise reject("Version 1 snapshot must contain only config and nodePlacements.")
    config = snapshot["config"]
    v1_groups = ("layout", "node", "hub", "line", "motion")
    if not isinstance(config, dict) or set(config) != set(v1_groups):
        raise reject("Version 1 config must contain exactly the expected groups.")
    for group in v1_groups:
        descriptors = DESCRIPTORS[group]
        keys = set(descriptors)
        if group == "line":
            keys = {"width", "activeWidth", "opacity"}
        group_value = config[group]
        if not isinstance(group_value, dict) or set(group_value) != keys:
            raise reject(f"Version 1 config group {group} has missing or extra keys.")
        for key in keys:
            validate_descriptor_value(group_value[key], descriptors[key], f"{group}.{key}")
    validate_placements(snapshot["nodePlacements"])
    return snapshot


def migrate_v1_snapshot(snapshot: Any, *, neutral_gradient: bool) -> dict[str, Any]:
    migrated = deepcopy(validate_v1_snapshot(snapshot))
    migrated["config"]["line"].update(deepcopy(LINE_V2_DEFAULTS))
    if neutral_gradient:
        migrated["config"]["line"]["gradientEnabled"] = False
    migrated["config"]["effects"] = deepcopy(EFFECT_DEFAULTS)
    migrated["webs"] = [
        {"id": f"node-{index}", "overrides": {}}
        for index in range(1, NODE_PLACEMENT_COUNT + 1)
    ]
    return validate_snapshot(migrated)


def validate_existing_config(current: Any) -> dict[str, Any]:
    """Validate the complete on-disk configuration before preserving any of it."""
    if not isinstance(current, dict):
        raise reject("Current configuration file must contain a JSON object.")

    if set(current) != {"version", "original", "saved"}:
        raise reject(
            "Current configuration file must contain exactly "
            "version, original, and saved."
        )

    version = current["version"]
    if version not in {1, CURRENT_VERSION} or isinstance(version, bool):
        raise reject("Current configuration version must be 1 or 2.")

    try:
        original = (
            migrate_v1_snapshot(current["original"], neutral_gradient=True)
            if version == 1
            else validate_snapshot(current["original"])
        )
    except ValueError as error:
        raise reject(
            f"Current original configuration is invalid: {error}"
        ) from error

    try:
        saved = (
            migrate_v1_snapshot(current["saved"], neutral_gradient=False)
            if version == 1
            else validate_snapshot(current["saved"])
        )
    except ValueError as error:
        raise reject(
            f"Current saved configuration is invalid: {error}"
        ) from error

    return {"version": CURRENT_VERSION, "original": original, "saved": saved}


class ShowcaseDevServer(ThreadingHTTPServer):
    """HTTP server carrying the explicit unsafe-network override setting."""

    allow_reuse_address = True

    def __init__(
        self,
        server_address: tuple[str, int],
        request_handler_class: type[SimpleHTTPRequestHandler],
        *,
        unsafe_allow_non_loopback: bool,
    ) -> None:
        super().__init__(server_address, request_handler_class)
        self.unsafe_allow_non_loopback = unsafe_allow_non_loopback


class ShowcaseDevHandler(SimpleHTTPRequestHandler):
    server_version = "ShowcaseDevHTTP/1.1"

    @property
    def showcase_server(self) -> ShowcaseDevServer:
        return self.server  # type: ignore[return-value]

    def end_headers(self) -> None:
        """Prevent stale local assets while using the Showcase Dev Lab."""
        if self.command in {"GET", "HEAD"}:
            self.send_header("Cache-Control", "no-store, max-age=0")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def validate_write_source(self) -> None:
        """Reject write requests that are not clearly directed at this server."""
        client_hostname = normalize_hostname(self.client_address[0])

        if (
            not self.showcase_server.unsafe_allow_non_loopback
            and not is_loopback_hostname(client_hostname)
        ):
            raise PermissionError(
                "Write requests are accepted only from a loopback client."
            )

        host_header = self.headers.get("Host", "")
        host_hostname, host_port = parse_host_header(host_header)

        if not is_loopback_hostname(host_hostname):
            raise PermissionError(
                "Write requests require a loopback Host hostname."
            )

        request_port = self.showcase_server.server_port

        # When a port is supplied in Host, it must describe the socket that
        # actually received this request.
        if host_port is not None and host_port != request_port:
            raise PermissionError(
                "Host port does not match the local server port."
            )

        origin = self.headers.get("Origin")
        if origin is None:
            # Deliberate curl or other command-line requests may omit Origin.
            return

        parsed_origin = urlparse(origin)
        origin_hostname = normalize_hostname(parsed_origin.hostname)

        if (
            parsed_origin.scheme not in {"http", "https"}
            or not origin_hostname
            or parsed_origin.username is not None
            or parsed_origin.password is not None
            or parsed_origin.path not in ("", "/")
            or parsed_origin.params
            or parsed_origin.query
            or parsed_origin.fragment
        ):
            raise PermissionError("Origin header is invalid.")

        if not is_loopback_hostname(origin_hostname):
            raise PermissionError(
                "Write requests require a loopback Origin hostname."
            )

        try:
            explicit_origin_port = parsed_origin.port
        except ValueError as error:
            raise PermissionError(
                "Origin contains an invalid port."
            ) from error

        origin_port = effective_origin_port(
            parsed_origin.scheme,
            explicit_origin_port,
        )

        if origin_port != request_port:
            raise PermissionError(
                "Origin port does not match the local server port."
            )

    def do_POST(self) -> None:  # noqa: N802 - http.server API
        if urlparse(self.path).path != ENDPOINT:
            json_response(
                self,
                404,
                {"ok": False, "error": "Unknown endpoint."},
            )
            return

        try:
            self.validate_write_source()
        except (PermissionError, ValueError) as error:
            json_response(
                self,
                403,
                {"ok": False, "error": str(error)},
            )
            return

        content_type = (
            self.headers.get("Content-Type", "")
            .split(";", 1)[0]
            .strip()
            .lower()
        )
        if content_type != "application/json":
            json_response(
                self,
                415,
                {
                    "ok": False,
                    "error": "Content-Type must be application/json.",
                },
            )
            return

        content_length = self.headers.get("Content-Length")
        if content_length is None:
            json_response(
                self,
                411,
                {"ok": False, "error": "Content-Length is required."},
            )
            return

        try:
            length = int(content_length)
        except ValueError:
            json_response(
                self,
                400,
                {"ok": False, "error": "Invalid Content-Length."},
            )
            return

        if length <= 0:
            json_response(
                self,
                400,
                {"ok": False, "error": "Request body must not be empty."},
            )
            return

        if length > MAX_BODY_BYTES:
            json_response(
                self,
                413,
                {"ok": False, "error": "Request body is too large."},
            )
            return

        temporary_path: Path | None = None

        try:
            raw_body = self.rfile.read(length)
            if len(raw_body) != length:
                raise reject("Request body ended before Content-Length bytes.")

            payload = json.loads(raw_body.decode("utf-8"))
            submitted_snapshot = validate_snapshot(payload)

            current_data = json.loads(
                CONFIG_PATH.read_text(encoding="utf-8")
            )
            current_config = validate_existing_config(current_data)

            next_config = {
                "version": CURRENT_VERSION,
                "original": current_config["original"],
                "saved": submitted_snapshot,
            }

            CONFIG_PATH.parent.mkdir(parents=True, exist_ok=True)

            with NamedTemporaryFile(
                "w",
                encoding="utf-8",
                newline="\n",
                dir=CONFIG_PATH.parent,
                prefix=f".{CONFIG_PATH.name}.",
                suffix=".tmp",
                delete=False,
            ) as temporary_file:
                temporary_path = Path(temporary_file.name)
                json.dump(
                    next_config,
                    temporary_file,
                    indent=2,
                    ensure_ascii=False,
                )
                temporary_file.write("\n")
                temporary_file.flush()
                os.fsync(temporary_file.fileno())

            os.replace(temporary_path, CONFIG_PATH)
            temporary_path = None

        except UnicodeDecodeError:
            json_response(
                self,
                400,
                {"ok": False, "error": "Request body must be UTF-8 JSON."},
            )
            return
        except json.JSONDecodeError:
            json_response(
                self,
                400,
                {"ok": False, "error": "Request body must be valid JSON."},
            )
            return
        except ValueError as error:
            json_response(
                self,
                422,
                {"ok": False, "error": str(error)},
            )
            return
        except OSError as error:
            json_response(
                self,
                500,
                {"ok": False, "error": f"Save failed: {error}"},
            )
            return
        except Exception as error:  # pragma: no cover - defensive response
            json_response(
                self,
                500,
                {"ok": False, "error": f"Save failed: {error}"},
            )
            return
        finally:
            if temporary_path is not None:
                try:
                    temporary_path.unlink(missing_ok=True)
                except OSError:
                    # Do not replace the original save error with cleanup failure.
                    pass

        json_response(
            self,
            200,
            {"ok": True, "path": "data/showcase-config.json"},
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "Serve the portfolio with a local Showcase Dev Lab save endpoint."
        )
    )
    parser.add_argument(
        "--host",
        default="127.0.0.1",
        help="Bind host. Defaults to 127.0.0.1.",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=8000,
        help="Bind port. Defaults to 8000.",
    )
    parser.add_argument(
        "--unsafe-allow-non-loopback",
        action="store_true",
        help=(
            "Allow binding to a non-loopback address and accepting requests "
            "from non-loopback clients. Unsafe: the endpoint modifies a "
            "tracked repository file."
        ),
    )
    args = parser.parse_args()

    normalized_bind_host = normalize_hostname(args.host)
    if (
        normalized_bind_host not in ALLOWED_BIND_HOSTS
        and not args.unsafe_allow_non_loopback
    ):
        parser.error(
            "--host must be 127.0.0.1, localhost, or ::1. "
            "Use --unsafe-allow-non-loopback to override this protection."
        )

    if not 1 <= args.port <= 65_535:
        parser.error("--port must be between 1 and 65535.")

    os.chdir(ROOT)

    server = ShowcaseDevServer(
        (args.host, args.port),
        ShowcaseDevHandler,
        unsafe_allow_non_loopback=args.unsafe_allow_non_loopback,
    )

    display_host = f"[{args.host}]" if ":" in args.host else args.host

    print(f"Serving Showcase Dev Lab at http://{display_host}:{args.port}/")
    print(
        f"Warning: {ENDPOINT} writes data/showcase-config.json "
        "and is intended only for local development."
    )

    if args.unsafe_allow_non_loopback:
        print(
            "DANGER: Non-loopback binding/client access has been explicitly "
            "enabled."
        )

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
