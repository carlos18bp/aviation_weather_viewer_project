"""Stable SHA-256 inventory for the 48 owned staged assets."""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from pathlib import Path

from weather.demo.mobile_layers.constants import OWNED_DIRECTORIES


@dataclass(frozen=True, slots=True)
class AssetInventoryEntry:
    """One deterministic asset's relative path, byte size, and digest."""

    relative_path: str
    size_bytes: int
    sha256: str


def asset_inventory(root: Path) -> tuple[AssetInventoryEntry, ...]:
    """Return the sorted inventory without following files outside ownership."""
    entries = []
    for directory in OWNED_DIRECTORIES:
        for path in sorted((root / directory).glob("*")):
            if path.is_file() and not path.is_symlink():
                entries.append(
                    AssetInventoryEntry(
                        relative_path=path.relative_to(root).as_posix(),
                        size_bytes=path.stat().st_size,
                        sha256=hashlib.sha256(path.read_bytes()).hexdigest(),
                    )
                )
    return tuple(sorted(entries, key=lambda entry: entry.relative_path))
