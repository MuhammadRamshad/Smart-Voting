import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    risk_threshold: float = float(os.getenv("RISK_THRESHOLD", "0.6"))
    model_path: str = os.getenv("MODEL_PATH", "./saved_models/isolation_forest.pkl")
    port: int = int(os.getenv("PORT", "8001"))

settings = Settings()
