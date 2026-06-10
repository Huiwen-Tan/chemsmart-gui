from importlib import import_module


def test_chemsmart_dependency_is_supported() -> None:
    chemsmart = import_module("chemsmart")

    assert chemsmart.__version__.startswith("0.8.")
