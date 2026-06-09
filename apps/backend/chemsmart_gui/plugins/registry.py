from collections import defaultdict
from typing import Any


class PluginRegistry:
    """Simple in-memory plugin registry for extension discovery."""

    def __init__(self) -> None:
        self._plugins: dict[str, list[Any]] = defaultdict(list)

    def register(self, category: str, plugin: Any) -> None:
        self._plugins[category].append(plugin)

    def list_plugins(self, category: str | None = None) -> dict[str, list[Any]] | list[Any]:
        if category is None:
            return {key: list(value) for key, value in self._plugins.items()}
        return list(self._plugins.get(category, []))
