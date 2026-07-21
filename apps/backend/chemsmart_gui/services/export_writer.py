from pathlib import Path

from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.export import (
    MoleculeExportFiletype,
    MoleculeExportWriteResponse,
)


def validate_export_target(
    target_path: str,
    filetype: MoleculeExportFiletype,
) -> Path:
    export_path = Path(target_path)
    target_filetype = export_path.suffix.lower().removeprefix(".")
    if target_filetype != filetype:
        raise ValueError(
            f"Export target path must end with .{filetype}."
        )

    if export_path.exists():
        raise FileExistsError(f"Export target already exists: {export_path}")

    parent_path = export_path.parent
    if not parent_path.exists():
        raise FileNotFoundError(
            f"Export target directory does not exist: {parent_path}"
        )
    if not parent_path.is_dir():
        raise ValueError(
            f"Export target parent is not a directory: {parent_path}"
        )

    return export_path


def write_export_text(
    *,
    target_path: str,
    filetype: MoleculeExportFiletype,
    content: str,
) -> MoleculeExportWriteResponse:
    export_path = validate_export_target(target_path, filetype)

    try:
        with export_path.open("x", encoding="utf-8") as export_file:
            export_file.write(content)
    except FileExistsError as exc:
        raise FileExistsError(
            f"Export target already exists: {export_path}"
        ) from exc
    except FileNotFoundError as exc:
        raise FileNotFoundError(
            f"Export target directory does not exist: {export_path.parent}"
        ) from exc

    return MoleculeExportWriteResponse(
        filename=export_path.name,
        filetype=filetype,
        path=str(export_path),
        bytes_written=len(content.encode("utf-8")),
    )


def validate_source_revision(
    document: MoleculeDocument,
    source_path: Path,
) -> None:
    if document.source is None:
        raise ValueError("Source write-back requires an existing source file.")

    if (
        document.source.size_bytes is None
        or document.source.modified_time_ns is None
    ):
        raise ValueError(
            "Source write-back requires source revision metadata. "
            "Reopen the source file and try again."
        )

    source_stat = source_path.stat()
    if (
        source_stat.st_size != document.source.size_bytes
        or source_stat.st_mtime_ns != document.source.modified_time_ns
    ):
        raise ValueError(
            "Source file changed since this document was opened. "
            "Reopen the source file before writing source changes."
        )


def write_source_text(
    *,
    source_path: Path,
    content: str,
) -> int:
    source_path.write_text(content, encoding="utf-8")
    return len(content.encode("utf-8"))
