import os
from pathlib import Path
from pydantic import BaseModel
from dotenv import load_dotenv

# Search for root .env or local .env
root_env = Path(__file__).resolve().parent.parent / ".env"
local_env = Path(__file__).resolve().parent / ".env"

if root_env.exists():
    load_dotenv(dotenv_path=root_env)
elif local_env.exists():
    load_dotenv(dotenv_path=local_env)
else:
    load_dotenv()

class Settings(BaseModel):
    risk_threshold: float = float(os.getenv("RISK_THRESHOLD", "0.6"))
    model_path: str = os.getenv("MODEL_PATH", "./saved_models/isolation_forest.pkl")
    port: int = int(os.getenv("PORT", "8001"))

settings = Settings()
