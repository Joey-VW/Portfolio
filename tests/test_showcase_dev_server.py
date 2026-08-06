from __future__ import annotations

import http.client
import json
import threading
import unittest
from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

from tools import serve_showcase_dev as showcase_server


ROOT = Path(__file__).resolve().parents[1]


def load_v2() -> dict[str, object]:
    return json.loads((ROOT / "data" / "showcase-config.json").read_text(encoding="utf-8"))


def to_v1_snapshot(snapshot: dict[str, object]) -> dict[str, object]:
    result = deepcopy(snapshot)
    config = result["config"]
    assert isinstance(config, dict)
    line = config["line"]
    assert isinstance(line, dict)
    config.pop("effects")
    result.pop("webs")
    for key in showcase_server.LINE_V2_DEFAULTS:
        line.pop(key)
    return result


class ShowcaseConfigValidationTests(unittest.TestCase):
    def test_v1_migration_preserves_values_and_adds_v2_defaults(self) -> None:
        current = load_v2()
        v1 = {
            "version": 1,
            "original": to_v1_snapshot(current["original"]),
            "saved": to_v1_snapshot(current["saved"]),
        }
        migrated = showcase_server.validate_existing_config(v1)
        self.assertEqual(migrated["version"], 2)
        self.assertFalse(migrated["original"]["config"]["line"]["gradientEnabled"])
        self.assertTrue(migrated["saved"]["config"]["line"]["gradientEnabled"])
        self.assertEqual(len(migrated["saved"]["webs"]), 7)
        self.assertEqual(
            migrated["saved"]["config"]["layout"]["hubYOffsetRatio"],
            v1["saved"]["config"]["layout"]["hubYOffsetRatio"],
        )

    def test_invalid_v2_fields_are_rejected(self) -> None:
        snapshot = deepcopy(load_v2()["saved"])
        snapshot["config"]["line"]["startColor"] = "cyan"
        with self.assertRaisesRegex(ValueError, "six-digit hex color"):
            showcase_server.validate_snapshot(snapshot)

        snapshot = deepcopy(load_v2()["saved"])
        snapshot["config"]["line"]["gradientEnabled"] = 1
        with self.assertRaisesRegex(ValueError, "must be a boolean"):
            showcase_server.validate_snapshot(snapshot)

        snapshot = deepcopy(load_v2()["saved"])
        snapshot["webs"][0]["overrides"]["bend"] = 900
        with self.assertRaisesRegex(ValueError, "finite number in range"):
            showcase_server.validate_snapshot(snapshot)


class ShowcaseSaveEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temp_directory = TemporaryDirectory()
        self.config_path = Path(self.temp_directory.name) / "showcase-config.json"
        self.config_path.write_text(json.dumps(load_v2(), indent=2) + "\n", encoding="utf-8")
        self.path_patch = patch.object(showcase_server, "CONFIG_PATH", self.config_path)
        self.path_patch.start()
        self.server = showcase_server.ShowcaseDevServer(
            ("127.0.0.1", 0),
            showcase_server.ShowcaseDevHandler,
            unsafe_allow_non_loopback=False,
        )
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()

    def tearDown(self) -> None:
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        self.path_patch.stop()
        self.temp_directory.cleanup()

    def post(self, payload: object) -> tuple[int, dict[str, object]]:
        body = json.dumps(payload).encode("utf-8")
        connection = http.client.HTTPConnection("127.0.0.1", self.server.server_port, timeout=5)
        connection.request(
            "POST",
            showcase_server.ENDPOINT,
            body=body,
            headers={
                "Content-Type": "application/json",
                "Origin": f"http://127.0.0.1:{self.server.server_port}",
            },
        )
        response = connection.getresponse()
        result = json.loads(response.read().decode("utf-8"))
        connection.close()
        return response.status, result

    def test_save_replaces_only_saved_snapshot_and_leaves_no_temp_file(self) -> None:
        before = load_v2()
        submitted = deepcopy(before["saved"])
        submitted["config"]["layout"]["hubXRatio"] = 0.51
        status, result = self.post(submitted)
        self.assertEqual(status, 200)
        self.assertTrue(result["ok"])
        after = json.loads(self.config_path.read_text(encoding="utf-8"))
        self.assertEqual(after["version"], 2)
        self.assertEqual(after["original"], before["original"])
        self.assertEqual(after["saved"], submitted)
        self.assertEqual(list(self.config_path.parent.glob(".*.tmp")), [])

    def test_rejected_save_preserves_file(self) -> None:
        before_text = self.config_path.read_text(encoding="utf-8")
        invalid = deepcopy(load_v2()["saved"])
        invalid["webs"].pop()
        status, result = self.post(invalid)
        self.assertEqual(status, 422)
        self.assertFalse(result["ok"])
        self.assertEqual(self.config_path.read_text(encoding="utf-8"), before_text)


if __name__ == "__main__":
    unittest.main()
