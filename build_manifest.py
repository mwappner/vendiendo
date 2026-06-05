#!/usr/bin/env python3
"""Generate the static product manifest used by the catalog page."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRODUCTS_DIR = ROOT / "content" / "products"
MANIFEST_PATH = ROOT / "content" / "products.json"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
LEGACY_LINE_COUNT = 4
EXPECTED_MIN_LINE_COUNT = 5


def image_sort_key(path: Path) -> tuple[int, str]:
    suffix = path.stem.rsplit("_", 1)[-1]
    if suffix.isdigit():
        return (int(suffix), path.name.lower())
    return (0, path.name.lower())


def matching_images(product_id: str) -> list[str]:
    images = []

    for path in PRODUCTS_DIR.iterdir():
        if not path.is_file() or path.name.startswith("."):
            continue
        if path.suffix.lower() not in IMAGE_EXTENSIONS:
            continue
        stem = path.stem
        if stem == product_id or (
            stem.startswith(f"{product_id}_")
            and stem.removeprefix(f"{product_id}_").isdigit()
        ):
            images.append(path)

    return [path.name for path in sorted(images, key=image_sort_key)]


def product_lines(path: Path) -> list[str]:
    lines = path.read_text(encoding="utf-8").replace("\r\n", "\n").split("\n")
    while len(lines) > 1 and not lines[-1].strip():
        lines.pop()
    return lines


def warn_about_product_text(path: Path) -> None:
    lines = product_lines(path)
    line_count = len(lines)
    warnings = []

    if line_count < LEGACY_LINE_COUNT:
        warnings.append(
            "expected 5 lines: name, note, price, size, status"
        )
    elif line_count == LEGACY_LINE_COUNT:
        warnings.append(
            "uses the old 4-line format; price will be empty"
        )

    if not (lines[0] if lines else "").strip():
        warnings.append("missing product name")
    if not (lines[-1] if lines else "").strip():
        warnings.append("missing status")

    for warning in warnings:
        print(f"Warning: {path.relative_to(ROOT)} {warning}.")


def build_manifest() -> list[dict[str, object]]:
    if not PRODUCTS_DIR.exists():
        raise FileNotFoundError(f"Missing products directory: {PRODUCTS_DIR}")

    manifest = []
    text_files = sorted(
        path
        for path in PRODUCTS_DIR.glob("*.txt")
        if path.is_file() and not path.name.startswith(".")
    )

    for text_file in text_files:
        product_id = text_file.stem
        warn_about_product_text(text_file)
        manifest.append(
            {
                "id": product_id,
                "text": text_file.name,
                "images": matching_images(product_id),
            }
        )

    return manifest


def main() -> None:
    manifest = build_manifest()
    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Generated content/products.json with {len(manifest)} products.")


if __name__ == "__main__":
    main()
