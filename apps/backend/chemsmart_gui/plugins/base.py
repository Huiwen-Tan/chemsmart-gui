from abc import ABC, abstractmethod


class StructureIOPlugin(ABC):
    """Interface for structure import/export plugins."""

    @abstractmethod
    def name(self) -> str:
        """Return plugin display name."""


class ResultParserPlugin(ABC):
    """Interface for computational result parser plugins."""

    @abstractmethod
    def name(self) -> str:
        """Return plugin display name."""


class JobProviderPlugin(ABC):
    """Interface for local/remote job provider plugins."""

    @abstractmethod
    def name(self) -> str:
        """Return plugin display name."""


class AnalysisPlugin(ABC):
    """Interface for chemistry analysis plugins."""

    @abstractmethod
    def name(self) -> str:
        """Return plugin display name."""
