"""
HTTP client wrapper for API tests.
All methods return the raw requests.Response so tests can assert on
status_code and .json() directly.
"""
import requests


class APIClient:
    def __init__(self, base_url: str, headers: dict | None = None):
        self.base_url = base_url.rstrip("/")
        self.session = requests.Session()
        if headers:
            self.session.headers.update(headers)

    def _url(self, path: str) -> str:
        return f"{self.base_url}{path}"

    def get(self, path: str, **kwargs) -> requests.Response:
        return self.session.get(self._url(path), **kwargs)

    def post(self, path: str, **kwargs) -> requests.Response:
        return self.session.post(self._url(path), **kwargs)

    def put(self, path: str, **kwargs) -> requests.Response:
        return self.session.put(self._url(path), **kwargs)

    def delete(self, path: str, **kwargs) -> requests.Response:
        return self.session.delete(self._url(path), **kwargs)

    def with_headers(self, headers: dict) -> "APIClient":
        """Return a new client that merges additional headers."""
        merged = dict(self.session.headers)
        merged.update(headers)
        c = APIClient(self.base_url)
        c.session.headers.update(merged)
        return c
