"""Controlled temporary generation and rollback-safe directory swaps."""

from __future__ import annotations

import shutil
import tempfile
from pathlib import Path

from weather.demo.exceptions import DemoAssetError
from weather.demo.mobile_layers.constants import OWNED_DIRECTORIES, SCENARIO_ID
from weather.demo.mobile_layers.generation import generate_asset_tree


def _temporary_root(parent: Path, kind: str) -> Path:
    parent.mkdir(parents=True, exist_ok=True)
    return Path(tempfile.mkdtemp(prefix=f".{SCENARIO_ID}-{kind}-", dir=parent))


def generate_external_asset_tree(output_root: Path, *, dependency_root: Path) -> None:
    """Generate into a temporary sibling and publish only a complete output tree."""
    resolved_output = output_root.resolve(strict=False)
    resolved_dependency = dependency_root.resolve(strict=False)
    if (
        resolved_output == resolved_dependency
        or resolved_dependency in resolved_output.parents
    ):
        raise DemoAssetError("Use the default command to replace versioned assets.")
    if output_root.is_symlink():
        raise DemoAssetError("The aviation output root cannot be a symbolic link.")
    existed_empty = output_root.exists()
    if existed_empty and (not output_root.is_dir() or any(output_root.iterdir())):
        raise DemoAssetError("The aviation output directory must be empty.")

    staging_root = _temporary_root(output_root.parent, "output")
    try:
        generate_asset_tree(staging_root, dependency_root=dependency_root)
        if existed_empty:
            output_root.rmdir()
        try:
            staging_root.rename(output_root)
        except OSError:
            if existed_empty and not output_root.exists():
                output_root.mkdir()
            raise
    finally:
        if staging_root.exists():
            shutil.rmtree(staging_root)


def replace_versioned_assets(scenario_root: Path) -> None:
    """Replace only eight owned directories after full temporary validation."""
    if scenario_root.is_symlink() or not scenario_root.is_dir():
        raise DemoAssetError("The versioned scenario root is invalid.")
    staging_root = _temporary_root(scenario_root.parent, "staging")
    backup_root = _temporary_root(scenario_root.parent, "backup")
    moved_old: list[str] = []
    installed_new: list[str] = []
    preserve_recovery_roots = False
    try:
        generate_asset_tree(staging_root, dependency_root=scenario_root)
        for directory in OWNED_DIRECTORIES:
            target = scenario_root / directory
            if target.is_symlink():
                raise DemoAssetError(
                    "Versioned aviation directories cannot be symlinks."
                )
            if target.exists() and not target.is_dir():
                raise DemoAssetError("Versioned aviation products must be directories.")

        try:
            for directory in OWNED_DIRECTORIES:
                target = scenario_root / directory
                if target.exists():
                    target.rename(backup_root / directory)
                    moved_old.append(directory)
            for directory in OWNED_DIRECTORIES:
                (staging_root / directory).rename(scenario_root / directory)
                installed_new.append(directory)
        except OSError as exc:
            rollback_error: OSError | None = None
            for directory in reversed(installed_new):
                try:
                    (scenario_root / directory).rename(staging_root / directory)
                except OSError as rollback_exc:
                    rollback_error = rollback_exc
                    break
            if rollback_error is None:
                for directory in reversed(moved_old):
                    try:
                        (backup_root / directory).rename(scenario_root / directory)
                    except OSError as rollback_exc:
                        rollback_error = rollback_exc
                        break
            if rollback_error is not None:
                preserve_recovery_roots = True
                raise DemoAssetError(
                    "The aviation asset swap failed and rollback was incomplete."
                ) from rollback_error
            raise DemoAssetError(
                "The aviation asset swap failed; the previous set was restored."
            ) from exc
    finally:
        if staging_root.exists() and not preserve_recovery_roots:
            shutil.rmtree(staging_root)
        if backup_root.exists() and not preserve_recovery_roots:
            shutil.rmtree(backup_root)
