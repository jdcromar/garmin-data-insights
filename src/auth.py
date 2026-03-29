import os
from pathlib import Path
from garminconnect import Garmin
from dotenv import load_dotenv

load_dotenv()

TOKEN_STORE = Path(".garth")


def get_client() -> Garmin:
    """Return an authenticated Garmin client, reusing stored tokens when possible."""
    email = os.getenv("GARMIN_EMAIL")
    password = os.getenv("GARMIN_PASSWORD")

    if not email or not password:
        raise ValueError("GARMIN_EMAIL and GARMIN_PASSWORD must be set in your .env file.")

    client = Garmin(email, password)

    if TOKEN_STORE.exists():
        client.login(str(TOKEN_STORE))
    else:
        client.login()
        TOKEN_STORE.mkdir(exist_ok=True)
        client.garth.dump(str(TOKEN_STORE))

    return client
