#!/usr/bin/env python3
"""Generate the static product manifest used by the catalog page."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
PRODUCTS_DIR = ROOT / "content" / "products"
MANIFEST_PATH = ROOT / "content" / "products.json"
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


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
