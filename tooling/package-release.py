#!/usr/bin/env python3
"""Build deterministic Rations & Rot release archives using Python stdlib only."""

from __future__ import annotations

import hashlib
from pathlib import Path
import sys
import zipfile

ROOT = Path(__file__).resolve().parent.parent
VERSION = "1.0.2"
MODULE_ID = "rations-and-rot"
ZIP_TIMESTAMP = (2026, 8, 9, 0, 0, 0)

RUNTIME_PREFIXES = ("scripts/", "styles/", "templates/", "lang/")
RUNTIME_FILES = {"module.json"}
SOURCE_EXCLUDES = {".DS_Store"}
DOC_PREFIXES = ("docs/", "tests/")
DOC_FILES = {
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "module.json",
    "package.json",
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def source_files() -> list[Path]:
    files: list[Path] = []
    for path in ROOT.rglob("*"):
        if not path.is_file():
            continue
        if path.name in SOURCE_EXCLUDES or "__pycache__" in path.parts:
            continue
        files.append(path)
    return sorted(files, key=lambda item: item.relative_to(ROOT).as_posix())


def runtime_files() -> list[Path]:
    return [
        path
        for path in source_files()
        if path.relative_to(ROOT).as_posix() in RUNTIME_FILES
        or path.relative_to(ROOT).as_posix().startswith(RUNTIME_PREFIXES)
    ]


def documentation_files() -> list[Path]:
    return [
        path
        for path in source_files()
        if path.relative_to(ROOT).as_posix() in DOC_FILES
        or path.relative_to(ROOT).as_posix().startswith(DOC_PREFIXES)
    ]


def zip_info(relative: str) -> zipfile.ZipInfo:
    info = zipfile.ZipInfo(f"{MODULE_ID}/{relative}", ZIP_TIMESTAMP)
    info.compress_type = zipfile.ZIP_DEFLATED
    info.external_attr = 0o100644 << 16
    return info


def write_zip(destination: Path, files: list[Path], extra_entries: dict[str, bytes] | None = None) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    entries = [(path.relative_to(ROOT).as_posix(), path.read_bytes()) for path in files]
    entries.extend((extra_entries or {}).items())
    entries.sort(key=lambda entry: entry[0])

    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for relative, content in entries:
            archive.writestr(zip_info(relative), content)


def main() -> int:
    output = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else ROOT.parent / "dist"
    output.mkdir(parents=True, exist_ok=True)

    source_archive = output / f"Rations-and-Rot-v{VERSION}-source.zip"
    module_archive = output / f"Rations-and-Rot-v{VERSION}-module.zip"
    documentation_archive = output / f"Rations-and-Rot-v{VERSION}-documentation.zip"

    write_zip(source_archive, source_files())
    write_zip(module_archive, runtime_files())

    checksum_text = (
        f"# {MODULE_ID}-{VERSION}\n\n"
        "## Release Archive Checksums\n\n"
        f"{sha256(source_archive)}  {source_archive.name}\n"
        f"{sha256(module_archive)}  {module_archive.name}\n"
        "\nThe documentation archive cannot contain its own checksum without making the checksum self-referential.\n"
    ).encode("utf-8")
    write_zip(
        documentation_archive,
        documentation_files(),
        {"docs/RELEASE-CHECKSUMS.txt": checksum_text},
    )

    archives = {
        "source": source_archive,
        "module": module_archive,
        "documentation": documentation_archive,
    }
    for label, path in archives.items():
        print(f"{label}: {path}")
        print(f"  sha256: {sha256(path)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
