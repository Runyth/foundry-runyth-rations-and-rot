#!/usr/bin/env python3
"""Verify Rations & Rot release archive safety and runtime/source separation."""

from __future__ import annotations

import json
from pathlib import Path, PurePosixPath
import sys
import zipfile

MODULE_ID = "rations-and-rot"
VERSION = "1.0.2"
ROOT_PREFIX = f"{MODULE_ID}/"


def fail(message: str) -> None:
    raise SystemExit(message)


def safe_members(archive: zipfile.ZipFile) -> list[str]:
    names = archive.namelist()
    if not names:
        fail(f"{archive.filename}: archive is empty")
    for name in names:
        pure = PurePosixPath(name)
        if pure.is_absolute() or ".." in pure.parts:
            fail(f"{archive.filename}: unsafe path {name}")
        if not name.startswith(ROOT_PREFIX):
            fail(f"{archive.filename}: unexpected root {name}")
    return names


def verify_module(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        names = safe_members(archive)
        forbidden = ("docs/", "tests/", "tooling/", "README.md", "CHANGELOG.md", "package.json")
        relative = [name.removeprefix(ROOT_PREFIX) for name in names]
        if any(name.startswith(forbidden) or name in forbidden for name in relative):
            fail(f"{path}: install archive contains non-runtime material")
        manifest = json.loads(archive.read(f"{ROOT_PREFIX}module.json"))
        if manifest.get("id") != MODULE_ID or manifest.get("version") != VERSION:
            fail(f"{path}: manifest identity/version mismatch")


def verify_source(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        names = set(safe_members(archive))
        required = {
            f"{ROOT_PREFIX}module.json",
            f"{ROOT_PREFIX}README.md",
            f"{ROOT_PREFIX}tests/actor-scope.test.mjs",
            f"{ROOT_PREFIX}tooling/package-release.py",
            f"{ROOT_PREFIX}tooling/static-audit.mjs",
        }
        missing = sorted(required - names)
        if missing:
            fail(f"{path}: source archive missing {missing}")


def verify_documentation(path: Path) -> None:
    with zipfile.ZipFile(path) as archive:
        names = set(safe_members(archive))
        required = {
            f"{ROOT_PREFIX}docs/AUDIT.md",
            f"{ROOT_PREFIX}docs/MANUAL-TEST-PLAN.md",
            f"{ROOT_PREFIX}docs/AUTOMATED-VALIDATION.txt",
            f"{ROOT_PREFIX}docs/RELEASE-CHECKSUMS.txt",
            f"{ROOT_PREFIX}tests/dashboard-layout.test.mjs",
        }
        missing = sorted(required - names)
        if missing:
            fail(f"{path}: documentation archive missing {missing}")


def main() -> int:
    if len(sys.argv) != 4:
        fail("usage: verify-archives.py SOURCE_ZIP MODULE_ZIP DOCUMENTATION_ZIP")
    source, module, documentation = map(Path, sys.argv[1:])
    verify_source(source)
    verify_module(module)
    verify_documentation(documentation)
    print("Archive verification passed: safe paths, single module root, runtime/source/documentation separation.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
