"""In-memory history state for molecule edit commands."""

from __future__ import annotations

from dataclasses import dataclass, field

from chemsmart_gui.domain.document import MoleculeDocument
from chemsmart_gui.domain.edit import MoleculeEditCommand
from chemsmart_gui.services.molecule_edit_service import MoleculeEditService


@dataclass(frozen=True)
class MoleculeEditSnapshot:
    """A reversible before/after document snapshot for one edit command."""

    command: MoleculeEditCommand
    before_document: MoleculeDocument
    after_document: MoleculeDocument

    @classmethod
    def create(
        cls,
        command: MoleculeEditCommand,
        before_document: MoleculeDocument,
        after_document: MoleculeDocument,
    ) -> "MoleculeEditSnapshot":
        return cls(
            command=command.model_copy(deep=True),
            before_document=before_document.model_copy(deep=True),
            after_document=after_document.model_copy(deep=True),
        )


@dataclass(frozen=True)
class MoleculeEditHistory:
    """Track current molecule document state with undo and redo stacks."""

    current_document: MoleculeDocument
    undo_stack: tuple[MoleculeEditSnapshot, ...] = field(default_factory=tuple)
    redo_stack: tuple[MoleculeEditSnapshot, ...] = field(default_factory=tuple)
    edit_service: MoleculeEditService = field(
        default_factory=MoleculeEditService,
        compare=False,
        repr=False,
    )

    @classmethod
    def start(
        cls,
        document: MoleculeDocument,
        edit_service: MoleculeEditService | None = None,
    ) -> "MoleculeEditHistory":
        return cls(
            current_document=document.model_copy(deep=True),
            edit_service=edit_service or MoleculeEditService(),
        )

    @property
    def can_undo(self) -> bool:
        return bool(self.undo_stack)

    @property
    def can_redo(self) -> bool:
        return bool(self.redo_stack)

    def apply(self, command: MoleculeEditCommand) -> "MoleculeEditHistory":
        before_document = self.current_document.model_copy(deep=True)
        after_document = self.edit_service.apply_command(
            before_document,
            command,
        )
        snapshot = MoleculeEditSnapshot.create(
            command=command,
            before_document=before_document,
            after_document=after_document,
        )

        return MoleculeEditHistory(
            current_document=after_document.model_copy(deep=True),
            undo_stack=(*self.undo_stack, snapshot),
            redo_stack=(),
            edit_service=self.edit_service,
        )

    def undo(self) -> "MoleculeEditHistory":
        if not self.undo_stack:
            raise ValueError("No molecule edit is available to undo.")

        snapshot = self.undo_stack[-1]
        return MoleculeEditHistory(
            current_document=snapshot.before_document.model_copy(deep=True),
            undo_stack=self.undo_stack[:-1],
            redo_stack=(snapshot, *self.redo_stack),
            edit_service=self.edit_service,
        )

    def redo(self) -> "MoleculeEditHistory":
        if not self.redo_stack:
            raise ValueError("No molecule edit is available to redo.")

        snapshot = self.redo_stack[0]
        return MoleculeEditHistory(
            current_document=snapshot.after_document.model_copy(deep=True),
            undo_stack=(*self.undo_stack, snapshot),
            redo_stack=self.redo_stack[1:],
            edit_service=self.edit_service,
        )
