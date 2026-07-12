import unittest

from fastapi.testclient import TestClient

from backend.app.main import create_app


class AppStartupTests(unittest.TestCase):
    def test_health_endpoint_works(self) -> None:
        app = create_app()
        client = TestClient(app)

        response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"ok": True})


if __name__ == "__main__":
    unittest.main()
