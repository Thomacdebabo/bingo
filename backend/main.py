from __future__ import annotations

import json
from pathlib import Path
from typing import List, Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from pydantic import BaseModel

DATA_DIR = Path(__file__).parent / "data"
DATA_DIR.mkdir(exist_ok=True)


class Prediction(BaseModel):
    name: str
    description: Optional[str] = None
    state: Optional[bool] = None
    note: Optional[str] = None


class BingoCard(BaseModel):
    id: str
    name: str
    predictions: List[Prediction]


class BingoCardCreate(BaseModel):
    name: str
    predictions: List[Prediction]


class BingoCardSummary(BaseModel):
    id: str
    name: str
    count: int


app = FastAPI(title="Bingo Predictions Backend")

# Allow frontend requests (development convenience)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve the frontend static files (if present) and redirect root to the UI
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


def card_path(card_id: str) -> Path:
    return DATA_DIR / f"{card_id}.json"


def save_card(card: BingoCard) -> None:
    path = card_path(card.id)
    with path.open("w", encoding="utf-8") as f:
        json.dump(card.dict(), f, ensure_ascii=False, indent=2)


def load_card(card_id: str) -> BingoCard:
    path = card_path(card_id)
    if not path.exists():
        raise FileNotFoundError
    with path.open("r", encoding="utf-8") as f:
        data = json.load(f)
    # ensure name present for backward compatibility
    if "name" not in data or data.get("name") is None:
        data["name"] = ""
    return BingoCard(**data)


# expose a ping only if frontend isn't present (mount static later)


@app.post("/cards", response_model=BingoCard, status_code=201)
def create_card(payload: BingoCardCreate):
    # use short id (8 hex chars)
    card_id = uuid4().hex[:8]
    card = BingoCard(id=card_id, name=payload.name, predictions=payload.predictions)
    save_card(card)
    # debug log and return serialized dict to ensure proper JSON body
    print(f"Created card {card_id}")
    return card.dict()


@app.get("/cards/{card_id}", response_model=BingoCard)
def get_card(card_id: str):
    try:
        return load_card(card_id)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="Card not found")


@app.get("/cards", response_model=List[BingoCardSummary])
def list_cards():
    # scan data directory for saved cards
    cards: List[BingoCardSummary] = []
    for p in DATA_DIR.glob("*.json"):
        try:
            with p.open("r", encoding="utf-8") as f:
                data = json.load(f)
            cid = data.get("id") or p.stem
            name = data.get("name") or ""
            preds = data.get("predictions") or []
            cards.append(BingoCardSummary(id=cid, name=name, count=len(preds)))
        except Exception:
            continue
    # sort by name then id
    cards.sort(key=lambda c: (c.name.lower() if c.name else "", c.id))
    return cards


@app.put("/cards/{card_id}", response_model=BingoCard)
def update_card(card_id: str, payload: BingoCardCreate):
    path = card_path(card_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Card not found")
    card = BingoCard(id=card_id, name=payload.name, predictions=payload.predictions)
    save_card(card)
    print(f"Updated card {card_id}")
    return card.dict()


# If frontend assets are present, mount them at root AFTER registering API routes
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
else:

    @app.get("/")
    def ping():
        return {"ok": True, "service": "bingo-backend"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.main:app", host="0.0.0.0", port=8000, reload=True)
