from pathlib import Path
import os

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from dotenv import load_dotenv
from routers import chat as chat_router
from routers import config as config_router

BASE_DIR = Path(__file__).parent
load_dotenv(dotenv_path=BASE_DIR / ".env")

app = FastAPI(title="Box Breathing (FastAPI)")

app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/", response_class=HTMLResponse)
def index(request: Request):
    return templates.TemplateResponse("home.html", {"request": request})


@app.get("/select", response_class=HTMLResponse)
def select_values(request: Request):
    return templates.TemplateResponse("select_value.html", {"request": request})


@app.get("/box", response_class=HTMLResponse)
def box_page(request: Request):
    return templates.TemplateResponse("box.html", {"request": request})


@app.get("/circle", response_class=HTMLResponse)
def circle_page(request: Request):
    return templates.TemplateResponse("circle.html", {"request": request})


@app.get("/chat", response_class=HTMLResponse)
def chat_page(request: Request):
    return templates.TemplateResponse("chat.html", {"request": request})


@app.get("/focus", response_class=HTMLResponse)
def focus_page(request: Request):
    return templates.TemplateResponse("focus.html", {"request": request})


@app.get("/deep-focus", response_class=HTMLResponse)
def deep_focus_page(request: Request):
    return templates.TemplateResponse("deep_focus.html", {"request": request})


@app.get("/healthz")
def healthz():
    return {"ok": True}


# Mount API routers
app.include_router(config_router.router, prefix="/api", tags=["config"])
app.include_router(chat_router.router, prefix="/api", tags=["chat"])
