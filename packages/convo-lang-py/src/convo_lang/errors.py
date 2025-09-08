class ConvoError(Exception):
    """Base class for all Convo-Lang wrapper errors."""


class ConvoNotFound(ConvoError):
    """Raised when the Convo CLI binary or .convo file is not found."""


class ExecFailed(ConvoError):
    """Raised when the Convo CLI process exits with a non-zero status."""


class Timeout(ConvoError):
    """Raised when the Convo CLI process exceeds the allowed time."""


class ParseError(ConvoError):
    """Raised when parsing the CLI output fails."""
