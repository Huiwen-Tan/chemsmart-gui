"""Plugin interfaces and registry."""

from .base import AnalysisPlugin, JobProviderPlugin, ResultParserPlugin, StructureIOPlugin
from .registry import PluginRegistry

__all__ = [
    "StructureIOPlugin",
    "ResultParserPlugin",
    "JobProviderPlugin",
    "AnalysisPlugin",
    "PluginRegistry",
]
