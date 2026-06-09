class ChemsmartAdapter:
    """
    Adapter layer for future integration with the CHEMSMART Python package.

    This class must be the only place where the GUI backend directly imports
    or calls CHEMSMART internals.
    """

    def open_molecule_from_path(self, path: str) -> None:
        """Placeholder for future CHEMSMART-backed molecule loading."""
        # TODO: Integrate CHEMSMART structure loading here, e.g.:
        # from chemsmart import Molecule
        # return Molecule.from_filepath(path)
        raise NotImplementedError("CHEMSMART integration is not implemented yet.")
