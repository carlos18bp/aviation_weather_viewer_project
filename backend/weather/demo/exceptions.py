"""Domain exceptions for unavailable or invalid frozen assets."""


class DemoAssetError(Exception):
    """The frozen demo dataset cannot safely satisfy a request."""
