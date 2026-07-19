#!/usr/bin/env python3
"""Fetch Fry's/Kroger product observations into static Shrinkflation Tracker JSON.

Uses Kroger's official OAuth client-credentials API. Credentials are read from
environment variables; no secrets are written to output files.
"""
from __future__ import annotations

import argparse
import base64
import copy
import datetime as dt
import json
import os
import re
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

API_BASE = "https://api.kroger.com/v1"
TOKEN_URL = f"{API_BASE}/connect/oauth2/token"
ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PRODUCTS = ROOT / "data" / "shrinkflation-products.json"
DEFAULT_TARGETS = ROOT / "data" / "shrinkflation-api-targets.json"
DEFAULT_STAGING = ROOT / "data" / "shrinkflation-products.kroger-staging.json"
DEFAULT_FIXTURE = ROOT / "tools" / "fixtures" / "kroger-products-sample.json"
SOURCE_TYPE = "kroger_api"
RETAILER = "Kroger"
BANNER = "Fry's Food Stores"
VOLATILE_OBSERVATION_FIELDS = {"pulledAt"}
PROTECTED_PRODUCT_FIELDS = ["productName", "brand", "category", "department", "notes", "sourceType", "confidence", "quarterlyHistory"]

UNIT_ALIASES = {
    "ounce": "oz", "ounces": "oz", "oz": "oz",
    "fluid ounce": "fl oz", "fluid ounces": "fl oz", "fl oz": "fl oz", "floz": "fl oz",
    "pound": "lb", "pounds": "lb", "lb": "lb", "lbs": "lb",
    "gram": "g", "grams": "g", "g": "g", "kilogram": "kg", "kilograms": "kg", "kg": "kg",
    "count": "ct", "ct": "ct", "each": "ct", "ea": "ct",
    "roll": "roll", "rolls": "roll", "slice": "slice", "slices": "slice",
    "load": "load", "loads": "load", "can": "can", "cans": "can", "bar": "bar", "bars": "bar",
    "pack": "pk", "packs": "pk", "package": "pk", "pk": "pk",
}
UNIT_PATTERN = r"fl\s*oz|fluid\s*ounces?|ounces?|oz|lbs?|pounds?|kg|kilograms?|g|grams?|count|ct|each|ea|rolls?|slices?|loads?|cans?|bars?|packs?|package|pk"
PACK_SIZE_RE = re.compile(rf"(?P<count>\d+(?:\.\d+)?)\s*(?:x|×)\s*(?P<size>\d+(?:\.\d+)?)\s*(?P<unit>{UNIT_PATTERN})\b", re.I)

IMAGE_PERSPECTIVE_ORDER = {"front": 0, "featured": 1, "right": 2}
IMAGE_SIZE_ORDER = {"large": 0, "medium": 1, "xlarge": 2, "small": 3, "thumbnail": 4}


def normalize_image_candidates(raw: dict[str, Any], fallback_alt: str | None = None) -> list[dict[str, Any]]:
    """Return frontend-safe Kroger image candidates in deterministic priority order."""
    images = raw.get("images")
    if not isinstance(images, list):
        return []

    candidates: list[tuple[int, int, int, int, dict[str, Any]]] = []
    seen: set[str] = set()
    safe_alt = (fallback_alt or raw.get("description") or raw.get("brand") or "Product image").strip()
    for image_index, image in enumerate(images):
        if not isinstance(image, dict):
            continue
        perspective = str(image.get("perspective") or "").strip().lower()
        featured = bool(image.get("featured"))
        perspective_key = "featured" if featured and perspective != "front" else perspective
        perspective_rank = IMAGE_PERSPECTIVE_ORDER.get(perspective_key, 3)
        sizes = image.get("sizes")
        if not isinstance(sizes, list):
            continue
        for size_index, size in enumerate(sizes):
            if not isinstance(size, dict):
                continue
            url = str(size.get("url") or "").strip()
            if not url or url in seen:
                continue
            label = str(size.get("size") or "").strip().lower()
            candidate = {"url": url, "alt": str(image.get("altText") or safe_alt)}
            if perspective:
                candidate["perspective"] = perspective
            if label:
                candidate["size"] = label
            if "featured" in image:
                candidate["featured"] = featured
            seen.add(url)
            size_rank = IMAGE_SIZE_ORDER.get(label, len(IMAGE_SIZE_ORDER))
            candidates.append((perspective_rank, size_rank, image_index, size_index, candidate))
    candidates.sort(key=lambda item: item[:4])
    return [item[4] for item in candidates]

SIZE_RE = re.compile(rf"(?P<size>\d+(?:\.\d+)?)\s*(?P<unit>{UNIT_PATTERN})\b", re.I)


def load_dotenv(path: Path = ROOT / ".env") -> None:
    if not path.exists():
        return
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def request_json(url: str, *, method: str = "GET", headers: dict[str, str] | None = None, data: bytes | None = None) -> dict[str, Any]:
    req = urllib.request.Request(url, data=data, headers=headers or {}, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc: # type: ignore
        detail = exc.read().decode("utf-8", errors="replace")
        raise SystemExit(f"Kroger API request failed ({exc.code}) for {url}: {detail}") from exc


def get_token() -> str:
    client_id = os.environ.get("KROGER_CLIENT_ID")
    client_secret = os.environ.get("KROGER_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise SystemExit("Missing KROGER_CLIENT_ID or KROGER_CLIENT_SECRET. Copy .env.example to .env and fill in local values, or use --from-staging/--test-merge-fixture for offline validation.")
    basic = base64.b64encode(f"{client_id}:{client_secret}".encode()).decode()
    body = urllib.parse.urlencode({"grant_type": "client_credentials", "scope": "product.compact"}).encode()
    token = request_json(TOKEN_URL, method="POST", headers={"Authorization": f"Basic {basic}", "Content-Type": "application/x-www-form-urlencoded"}, data=body)
    return token["access_token"]


def discover_location(token: str) -> str:
    location_id = os.environ.get("KROGER_LOCATION_ID")
    if location_id:
        return location_id
    zip_code = os.environ.get("KROGER_ZIP_CODE")
    if not zip_code:
        raise SystemExit("Set KROGER_LOCATION_ID or KROGER_ZIP_CODE before fetching Kroger products.")
    query = urllib.parse.urlencode({"filter.zipCode.near": zip_code, "filter.limit": "1", "filter.chain": "FRYS"})
    data = request_json(f"{API_BASE}/locations?{query}", headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    locations = data.get("data") or []
    if not locations:
        raise SystemExit(f"No Fry's/Kroger locations found for ZIP code {zip_code}. Try setting KROGER_LOCATION_ID directly if your local banner string differs.")
    return locations[0]["locationId"]


def clean_unit(unit: str | None) -> str | None:
    if not unit:
        return None
    normalized = re.sub(r"\s+", " ", unit.lower()).strip()
    return UNIT_ALIASES.get(normalized, normalized)


def parse_size(text: str | None) -> dict[str, Any]:
    raw = (text or "").strip()
    if not raw:
        return {"raw": raw, "value": None, "unit": None, "confidence": "unparsed"}

    pack_match = PACK_SIZE_RE.search(raw)
    if pack_match:
        count = float(pack_match.group("count"))
        size = float(pack_match.group("size"))
        unit = clean_unit(pack_match.group("unit"))
        return {"raw": pack_match.group(0), "value": round(count * size, 6), "unit": unit, "confidence": "parsed", "pack": {"count": count, "eachValue": size, "eachUnit": unit}}

    match = SIZE_RE.search(raw)
    if not match:
        return {"raw": raw, "value": None, "unit": None, "confidence": "unparsed"}
    return {"raw": match.group(0), "value": float(match.group("size")), "unit": clean_unit(match.group("unit")), "confidence": "parsed"}


def first_item(raw: dict[str, Any]) -> dict[str, Any]:
    return (raw.get("items") or [{}])[0]


def effective_price(regular: float | None, promo: float | None) -> tuple[float | None, str | None]:
    if promo is not None:
        return promo, "promo"
    if regular is not None:
        return regular, "regular"
    return None, None


def normalize_product(raw: dict[str, Any], target: dict[str, Any], location_id: str, pulled_at: str, observed_at: str) -> dict[str, Any]:
    item = first_item(raw)
    price = item.get("price") or {}
    regular_price = price.get("regular")
    promo_price = price.get("promo")
    chosen_price, price_source = effective_price(regular_price, promo_price)
    parsed = parse_size(" ".join(filter(None, [item.get("size"), raw.get("description")])) )
    unit_price = round(chosen_price / parsed["value"], 6) if chosen_price is not None and parsed.get("value") else None
    fulfillment = item.get("fulfillment") or {}
    return {
        "targetId": target.get("id"),
        "searchTerm": target.get("searchTerm"),
        "sourceType": SOURCE_TYPE,
        "retailer": RETAILER,
        "banner": BANNER,
        "locationId": location_id,
        "observedAt": observed_at,
        "pulledAt": pulled_at,
        "krogerProductId": raw.get("productId"),
        "upc": raw.get("upc"),
        "description": raw.get("description"),
        "brand": raw.get("brand"),
        "categories": raw.get("categories"),
        "targetCategory": target.get("category"),
        "targetDepartment": target.get("department"),
        "rawSize": item.get("size"),
        "parsedSize": parsed,
        "regularPrice": regular_price,
        "promoPrice": promo_price,
        "effectivePrice": chosen_price,
        "priceSource": price_source,
        "unitPrice": unit_price,
        "available": bool(fulfillment),
        "fulfillment": fulfillment,
        "imageCandidates": normalize_image_candidates(raw, raw.get("description") or target.get("searchTerm")),
        "matchStatus": "locked" if target.get("preferredProductId") or target.get("preferredUpc") else (target.get("matchStatus") or "candidate"),
        "matchConfidence": "locked_match" if target.get("preferredProductId") or target.get("preferredUpc") else "candidate_match",
        "preferredProductId": target.get("preferredProductId"),
        "preferredUpc": target.get("preferredUpc"),
        "raw": raw,
    }


def matches_lock(raw: dict[str, Any], target: dict[str, Any]) -> bool:
    product_id = str(raw.get("productId") or "")
    upc = str(raw.get("upc") or "")
    preferred_product_id = str(target.get("preferredProductId") or "")
    preferred_upc = str(target.get("preferredUpc") or "")
    return bool((preferred_product_id and product_id == preferred_product_id) or (preferred_upc and upc == preferred_upc))


def apply_match_rules(products: list[dict[str, Any]], target: dict[str, Any]) -> list[dict[str, Any]]:
    exclude_terms = [term.lower() for term in target.get("excludeTerms", [])]
    filtered = [product for product in products if not any(term in (product.get("description") or "").lower() for term in exclude_terms)]
    if target.get("preferredProductId") or target.get("preferredUpc"):
        return [product for product in filtered if matches_lock(product, target)]
    brand_hints = [hint.lower() for hint in target.get("preferredBrandHints", [])]
    if brand_hints:
        filtered.sort(key=lambda product: 0 if (product.get("brand") or "").lower() in brand_hints else 1)
    return filtered


def fetch_target(token: str, target: dict[str, Any], location_id: str, limit: int, pulled_at: str, observed_at: str) -> list[dict[str, Any]]:
    query = urllib.parse.urlencode({"filter.term": target["searchTerm"], "filter.locationId": location_id, "filter.limit": str(limit)})
    data = request_json(f"{API_BASE}/products?{query}", headers={"Authorization": f"Bearer {token}", "Accept": "application/json"})
    return [normalize_product(p, target, location_id, pulled_at, observed_at) for p in apply_match_rules(data.get("data", []), target)]


def load_observations_from_staging(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    data = json.loads(path.read_text())
    observations = data.get("observations", [])
    if not isinstance(observations, list):
        raise SystemExit(f"{path} does not contain an observations array.")
    return observations, data


def observation_from_match(match: dict[str, Any]) -> dict[str, Any]:
    parsed = match.get("parsedSize") or {}
    return {
        "sourceType": SOURCE_TYPE,
        "retailer": match.get("retailer", RETAILER),
        "banner": match.get("banner", BANNER),
        "locationId": match.get("locationId"),
        "observedAt": match.get("observedAt"),
        "pulledAt": match.get("pulledAt"),
        "price": match.get("effectivePrice"),
        "regularPrice": match.get("regularPrice"),
        "promoPrice": match.get("promoPrice"),
        "effectivePrice": match.get("effectivePrice"),
        "priceSource": match.get("priceSource"),
        "size": parsed.get("value"),
        "unitLabel": parsed.get("unit"),
        "parsedSize": parsed,
        "rawSize": match.get("rawSize"),
        "unitPrice": match.get("unitPrice"),
        "krogerProductId": match.get("krogerProductId"),
        "upc": match.get("upc"),
        "description": match.get("description"),
        "brand": match.get("brand"),
        "matchStatus": match.get("matchStatus"),
        "matchConfidence": match.get("matchConfidence"),
    }


def observation_key(obs: dict[str, Any]) -> tuple[Any, ...]:
    return (obs.get("sourceType"), obs.get("retailer"), obs.get("banner"), obs.get("locationId"), obs.get("krogerProductId") or obs.get("upc"), obs.get("observedAt"))


def without_fields(item: dict[str, Any], fields: set[str]) -> dict[str, Any]:
    return {key: value for key, value in item.items() if key not in fields}


def merge_or_update(items: list[dict[str, Any]], new_item: dict[str, Any], key_fn, *, volatile_fields: set[str] | None = None) -> str:
    volatile_fields = volatile_fields or set()
    key = key_fn(new_item)
    for index, existing in enumerate(items):
        if key_fn(existing) == key:
            if without_fields(existing, volatile_fields) == without_fields(new_item, volatile_fields):
                return "unchanged"
            if existing != new_item:
                items[index] = new_item
                return "updated"
            return "unchanged"
    items.append(new_item)
    return "added"


def empty_summary(targets_loaded: int = 0) -> dict[str, int]:
    return {
        "targets_loaded": targets_loaded,
        "candidates_fetched": 0,
        "observations_parsed": 0,
        "observations_added": 0,
        "observations_updated": 0,
        "observations_unchanged": 0,
        "api_matches_added": 0,
        "api_matches_updated": 0,
        "api_matches_unchanged": 0,
        "products_matched": 0,
        "products_missing_target_ids": 0,
        "unparsed_size_count": 0,
        "missing_price_count": 0,
        "history_promotions_added": 0,
        "history_promotions_updated": 0,
        "locked_match_count": 0,
        "candidate_match_count": 0,
    }


def merge_observations(products_path: Path, matches: list[dict[str, Any]], *, promote_history: bool = False, period: str | None = None, targets_loaded: int = 0) -> tuple[dict[str, Any], dict[str, int]]:
    data = json.loads(products_path.read_text())
    original_data = copy.deepcopy(data)
    summary = empty_summary(targets_loaded)
    summary["candidates_fetched"] = len(matches)
    by_id = {p.get("id"): p for p in data.get("products", [])}
    matched_products: set[str] = set()

    for match in matches:
        product = by_id.get(match.get("targetId"))
        if not product:
            summary["products_missing_target_ids"] += 1
            continue
        if match.get("matchStatus") == "locked":
            summary["locked_match_count"] += 1
        else:
            summary["candidate_match_count"] += 1
        matched_products.add(product.get("id"))
        product.setdefault("apiMatches", [])
        product.setdefault("observations", [])

        if (match.get("parsedSize") or {}).get("confidence") != "parsed":
            summary["unparsed_size_count"] += 1
        if match.get("effectivePrice") is None:
            summary["missing_price_count"] += 1

        match_result = merge_or_update(
            product["apiMatches"],
            match,
            lambda item: (item.get("sourceType"), item.get("retailer"), item.get("banner"), item.get("locationId"), item.get("krogerProductId") or item.get("upc"), item.get("observedAt")),
            volatile_fields=VOLATILE_OBSERVATION_FIELDS,
        )
        summary[f"api_matches_{match_result}"] += 1

        observation = observation_from_match(match)
        if observation.get("price") is not None and observation.get("size") is not None:
            summary["observations_parsed"] += 1
        observation_result = merge_or_update(product["observations"], observation, observation_key, volatile_fields=VOLATILE_OBSERVATION_FIELDS)
        summary[f"observations_{observation_result}"] += 1

        if promote_history and observation.get("price") is not None and observation.get("size") is not None:
            history = product.setdefault("quarterlyHistory", [])
            history_period = period or f"Kroger {observation.get('observedAt')}"
            point = {"quarter": history_period, "size": observation["size"], "price": observation["price"]}
            if history and history[-1].get("quarter") == history_period:
                if history[-1] != point:
                    history[-1].update(point)
                    summary["history_promotions_updated"] += 1
            else:
                history.append(point)
                summary["history_promotions_added"] += 1

    summary["products_matched"] = len(matched_products)
    meaningful_changes = any(summary[key] for key in [
        "observations_added",
        "observations_updated",
        "api_matches_added",
        "api_matches_updated",
        "history_promotions_added",
        "history_promotions_updated",
    ])
    if meaningful_changes:
        data["lastKrogerObservationMergeAt"] = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    else:
        if "lastKrogerObservationMergeAt" in original_data:
            data["lastKrogerObservationMergeAt"] = original_data["lastKrogerObservationMergeAt"]
        else:
            data.pop("lastKrogerObservationMergeAt", None)
    return data, summary


def top_level_shape_ok(data: dict[str, Any]) -> bool:
    return isinstance(data, dict) and isinstance(data.get("products"), list)


def credential_values() -> list[str]:
    return [value for key in ["KROGER_CLIENT_ID", "KROGER_CLIENT_SECRET", "KROGER_LOCATION_ID", "KROGER_ZIP_CODE"] if (value := os.environ.get(key))]


def contains_secret(value: Any, secrets: list[str]) -> bool:
    if isinstance(value, str):
        return any(secret and secret in value for secret in secrets)
    if isinstance(value, list):
        return any(contains_secret(item, secrets) for item in value)
    if isinstance(value, dict):
        return any(contains_secret(k, secrets) or contains_secret(v, secrets) for k, v in value.items())
    return False


def strict_validate_merge(original: dict[str, Any], proposed: dict[str, Any], matches: list[dict[str, Any]], targets: list[dict[str, Any]], summary: dict[str, int]) -> None:
    errors: list[str] = []
    if not targets:
        errors.append("targets document contains no targets")
    if not matches:
        errors.append("API returned zero normalized observations")
    known_target_ids = {product.get("id") for product in original.get("products", [])}
    mapped_matches = [match for match in matches if match.get("targetId") in known_target_ids]
    if not mapped_matches:
        errors.append("no observations mapped to a known tracked product")
    if not top_level_shape_ok(proposed):
        errors.append("merged document is missing the expected top-level products array")
    elif not proposed.get("products"):
        errors.append("merged document contains an empty products array")
    original_ids = {product.get("id") for product in original.get("products", [])}
    proposed_ids = {product.get("id") for product in proposed.get("products", [])}
    removed = sorted(str(product_id) for product_id in original_ids - proposed_ids)
    if removed:
        errors.append(f"existing tracked products would be removed: {', '.join(removed)}")
    proposed_by_id = {product.get("id"): product for product in proposed.get("products", [])}
    for product in original.get("products", []):
        proposed_product = proposed_by_id.get(product.get("id"))
        if not proposed_product:
            continue
        for field in PROTECTED_PRODUCT_FIELDS:
            if proposed_product.get(field) != product.get(field):
                errors.append(f"protected field {field} changed for {product.get('id')}")
    unusable = [match for match in matches if match.get("effectivePrice") is None and not (match.get("parsedSize") or {}).get("value")]
    if matches and len(unusable) == len(matches):
        errors.append("every observation lacks both effective price and parsed size")
    secrets = credential_values()
    if secrets and contains_secret(proposed, secrets):
        errors.append("credential value detected in proposed output")
    try:
        json.loads(json.dumps(proposed))
    except (TypeError, ValueError) as exc:
        errors.append(f"proposed output is not valid JSON: {exc}")
    if errors:
        print("Strict validation failed with safe summary counts:", file=sys.stderr)
        print_summary(summary)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        raise SystemExit("Strict validation failed; production data was not written.")


def atomic_write_json(path: Path, data: dict[str, Any]) -> None:
    encoded = json.dumps(data, indent=2, sort_keys=False) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False, prefix=f".{path.name}.", suffix=".tmp") as tmp:
        tmp.write(encoded)
        temp_path = Path(tmp.name)
    temp_path.replace(path)


def display_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)

def write_json(path: Path, data: dict[str, Any]) -> None:
    path.write_text(json.dumps(data, indent=2, sort_keys=False) + "\n", encoding="utf-8")


def print_summary(summary: dict[str, int]) -> None:
    print("Kroger/Fry's fetch summary:")
    for key, value in summary.items():
        print(f"  {key}: {value}")


def print_match_review(observations: list[dict[str, Any]]) -> None:
    print("\nCandidate match review:")
    for obs in observations:
        status = obs.get("matchStatus") or obs.get("matchConfidence") or "candidate"
        parsed = obs.get("parsedSize") or {}
        price = obs.get("effectivePrice")
        unit_price = obs.get("unitPrice")
        print(f"- {obs.get('targetId')} [{status}]")
        print(f"  productId: {obs.get('krogerProductId')} | upc: {obs.get('upc')}")
        print(f"  brand/description: {obs.get('brand') or 'Unknown'} - {obs.get('description') or 'Unknown'}")
        print(f"  size: {obs.get('rawSize') or parsed.get('raw') or 'unparsed'} ({parsed.get('confidence') or 'unknown'}) | effective price: {price if price is not None else 'missing'} | unit price: {unit_price if unit_price is not None else 'n/a'}")


def run_fixture_tests(products_path: Path, fixture_path: Path) -> int:
    original = json.loads(products_path.read_text())
    before = copy.deepcopy(original)
    first = tempfile.NamedTemporaryFile("w+", delete=False, suffix=".json")
    try:
        json.dump(original, first)
        first.close()
        matches, staging = load_observations_from_staging(fixture_path)
        merged, summary = merge_observations(Path(first.name), matches, targets_loaded=staging.get("targetsLoaded", 0))
        second_path = Path(first.name + ".second")
        write_json(second_path, merged)
        merged_again, summary_again = merge_observations(second_path, matches, targets_loaded=staging.get("targetsLoaded", 0))
        if merged_again != merged:
            raise AssertionError("Repeating the same fixture observations changed merged output")

        volatile_matches = copy.deepcopy(matches)
        for match in volatile_matches:
            match["pulledAt"] = "2026-07-11T12:34:56Z"
        volatile_again, volatile_summary = merge_observations(second_path, volatile_matches, targets_loaded=staging.get("targetsLoaded", 0))
        if volatile_again != merged:
            raise AssertionError("Volatile pulledAt-only observation changes should not alter merged output")
        if volatile_summary["observations_updated"] != 0:
            raise AssertionError("Volatile pulledAt-only changes should not update stored observations")

        changed_matches = copy.deepcopy(matches)
        changed_matches[0]["effectivePrice"] = 6.49
        changed_matches[0]["regularPrice"] = 6.49
        changed_matches[0]["unitPrice"] = 0.135208
        changed_merge, changed_summary = merge_observations(second_path, changed_matches, targets_loaded=staging.get("targetsLoaded", 0))
        if changed_summary["observations_updated"] < 1:
            raise AssertionError("Substantive observation price change did not update stored observation")
        changed_product = next(p for p in changed_merge["products"] if p["id"] == changed_matches[0]["targetId"])
        changed_observation = next(obs for obs in changed_product["observations"] if observation_key(obs) == observation_key(observation_from_match(changed_matches[0])))
        if changed_observation.get("effectivePrice") != 6.49:
            raise AssertionError("Substantive observation update did not preserve the changed price")

        empty_summary_for_validation = empty_summary(len(targets := [{"id": "fixture-target"}]))
        try:
            strict_validate_merge(original, original, [], targets, empty_summary_for_validation)
        except SystemExit:
            pass
        else:
            raise AssertionError("Strict validation accepted empty observations")
        unusable = [copy.deepcopy(matches[0])]
        unusable[0]["effectivePrice"] = None
        unusable[0]["parsedSize"] = {"raw": "", "value": None, "unit": None, "confidence": "unparsed"}
        unusable_merged, unusable_summary = merge_observations(Path(first.name), unusable, targets_loaded=1)
        try:
            strict_validate_merge(original, unusable_merged, unusable, targets, unusable_summary)
        except SystemExit:
            pass
        else:
            raise AssertionError("Strict validation accepted unusable observations")
        strict_validate_merge(original, merged, matches, targets, summary)

        before_products = {p["id"]: p for p in before["products"]}
        after_products = {p["id"]: p for p in merged_again["products"]}
        for product_id, before_product in before_products.items():
            after_product = after_products[product_id]
            for field in ["productName", "brand", "category", "department", "notes", "sourceType", "confidence", "quarterlyHistory"]:
                if after_product.get(field) != before_product.get(field):
                    raise AssertionError(f"Fixture merge changed protected field {field} for {product_id}")
        if summary["observations_added"] < 1:
            raise AssertionError("Fixture did not add any observations")
        if summary_again["observations_unchanged"] < 1:
            raise AssertionError("Second fixture merge did not dedupe unchanged observations")
        unparsed = [m for m in matches if (m.get("parsedSize") or {}).get("confidence") == "unparsed"]
        if not unparsed or any(m.get("unitPrice") is not None for m in unparsed):
            raise AssertionError("Unparsed fixture sizes must not produce unit prices")

        malformed_cases = [
            ({}, []),
            ({"images": "not-a-list"}, []),
            ({"images": [{"perspective": "front"}]}, []),
            ({"images": [{"perspective": "front", "sizes": "large"}]}, []),
            ({"images": [{"perspective": "front", "sizes": [{"size": "large"}, {"url": ""}]}]}, []),
        ]
        for raw, expected in malformed_cases:
            if normalize_image_candidates(raw, "Fixture product") != expected:
                raise AssertionError(f"Malformed image fixture produced candidates: {raw}")

        image_fixture = {"description": "Fixture product", "images": [
            {"perspective": "right", "sizes": [{"size": "thumbnail", "url": "https://img.example/right-thumb"}, {"size": "large", "url": "https://img.example/right-large"}]},
            {"perspective": "front", "sizes": [{"size": "small", "url": "https://img.example/front-small"}, {"size": "small", "url": "https://img.example/right-large"}]},
            {"perspective": "left", "featured": True, "sizes": [{"size": "medium", "url": "https://img.example/featured-medium"}]},
            {"perspective": "back", "sizes": [{"size": "tiny", "url": "https://img.example/back-tiny"}, {"bad": "entry"}]},
            "bad-entry",
        ]}
        candidates = normalize_image_candidates(image_fixture)
        urls = [candidate.get("url") for candidate in candidates]
        expected_urls = [
            "https://img.example/front-small",
            "https://img.example/featured-medium",
            "https://img.example/right-large",
            "https://img.example/right-thumb",
            "https://img.example/back-tiny",
        ]
        if urls != expected_urls:
            raise AssertionError(f"Image candidate ordering changed: {urls}")
        if any(not candidate.get("url") or not candidate.get("alt") for candidate in candidates):
            raise AssertionError("Image normalization emitted malformed candidates")

        print_summary(summary)
        print("Fixture merge checks passed.")
        return 0
    finally:
        Path(first.name).unlink(missing_ok=True)
        Path(first.name + ".second").unlink(missing_ok=True)


def fetch_live(args: argparse.Namespace, targets: list[dict[str, Any]]) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    token = get_token()
    location_id = discover_location(token)
    pulled_at = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    observed_at = pulled_at.split("T", 1)[0]
    observations = [obs for target in targets for obs in fetch_target(token, target, location_id, args.limit, pulled_at, observed_at)]
    staging = {"retailer": RETAILER, "banner": BANNER, "locationId": location_id, "pulledAt": pulled_at, "observedAt": observed_at, "targetsLoaded": len(targets), "observations": observations}
    return observations, staging


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch Kroger/Fry's products for Shrinkflation Tracker static data. No files are written unless --write-staging, --apply-observations, or --promote-observations-to-history is provided.")
    parser.add_argument("--targets", type=Path, default=DEFAULT_TARGETS)
    parser.add_argument("--products", type=Path, default=DEFAULT_PRODUCTS)
    parser.add_argument("--staging-output", type=Path, default=DEFAULT_STAGING)
    parser.add_argument("--from-staging", type=Path, help="Read normalized staging JSON instead of calling Kroger. Useful without credentials.")
    parser.add_argument("--limit", type=int, default=None, help="Products to request per target when fetching live data.")
    parser.add_argument("--dry-run", action="store_true", help="Fetch or load and summarize only; do not write any files.")
    parser.add_argument("--write-staging", action="store_true", help="Write normalized observations to data/shrinkflation-products.kroger-staging.json.")
    parser.add_argument("--apply-observations", action="store_true", help="Merge observations into product apiMatches/observations fields without changing demo quarterlyHistory.")
    parser.add_argument("--promote-observations-to-history", action="store_true", help="Explicitly append parsed observations into quarterlyHistory. Not used by default.")
    parser.add_argument("--period", default=None, help="Period label for --promote-observations-to-history, for example 'Kroger 2026-07-11'.")
    parser.add_argument("--test-merge-fixture", action="store_true", help="Run offline fixture checks for parsing/merge behavior without Kroger credentials.")
    parser.add_argument("--review-matches", action="store_true", help="Print concise product IDs, UPCs, prices, sizes, and match status for candidate lock review.")
    parser.add_argument("--strict-validation", action="store_true", help="Validate prospective observation merges before writing production data. Intended for automation.")
    args = parser.parse_args()

    if args.test_merge_fixture:
        return run_fixture_tests(args.products, DEFAULT_FIXTURE)

    load_dotenv()
    targets_doc = json.loads(args.targets.read_text())
    targets = targets_doc.get("targets", [])
    args.limit = args.limit or int(targets_doc.get("defaultLimit", 5))

    if args.from_staging:
        observations, staging = load_observations_from_staging(args.from_staging)
        staging.setdefault("targetsLoaded", len(targets))
    else:
        observations, staging = fetch_live(args, targets)

    summary = empty_summary(staging.get("targetsLoaded", len(targets)))
    summary["candidates_fetched"] = len(observations)
    summary["unparsed_size_count"] = sum(1 for obs in observations if (obs.get("parsedSize") or {}).get("confidence") != "parsed")
    summary["missing_price_count"] = sum(1 for obs in observations if obs.get("effectivePrice") is None)
    summary["locked_match_count"] = sum(1 for obs in observations if obs.get("matchStatus") == "locked")
    summary["candidate_match_count"] = len(observations) - summary["locked_match_count"]

    if args.write_staging and not args.dry_run:
        write_json(args.staging_output, staging)
        print(f"Wrote {len(observations)} observations to {display_path(args.staging_output)}")

    if args.apply_observations or args.promote_observations_to_history:
        original_products = json.loads(args.products.read_text(encoding="utf-8"))
        merged, merge_summary = merge_observations(args.products, observations, promote_history=args.promote_observations_to_history, period=args.period, targets_loaded=summary["targets_loaded"])
        summary.update(merge_summary)
        if args.strict_validation:
            strict_validate_merge(original_products, merged, observations, targets, summary)
        if not args.dry_run:
            atomic_write_json(args.products, merged)
            print(f"Merged observations into {display_path(args.products)}")

    if not (args.write_staging or args.apply_observations or args.promote_observations_to_history or args.dry_run):
        print("No write mode selected. Use --dry-run to summarize, --write-staging to save staging JSON, or --apply-observations to update product observation fields.")

    print_summary(summary)
    if args.review_matches:
        print_match_review(observations)
    if args.dry_run:
        print("Dry run complete; no files were written.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
