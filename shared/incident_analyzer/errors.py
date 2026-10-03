class AnalysisError(Exception):
    """Raised when a CSV cannot be analysed (empty, missing, or wrong format)."""

    def __init__(self, message: str, code: str = "invalid_format", http_status: int = 400):
        super().__init__(message)
        self.message = message
        self.code = code
        self.http_status = http_status
