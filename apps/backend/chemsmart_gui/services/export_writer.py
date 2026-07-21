from pathlib import Path

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
