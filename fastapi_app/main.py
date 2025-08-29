from pathlib import Path
from typing import List, Optional, Literal

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel, field_validator

BASE_DIR = Path(__file__).parent

app = FastAPI(title="Box Breathing (FastAPI)")

# Static and templates
app.mount("/static", StaticFiles(directory=BASE_DIR / "static"), name="static")
templates = Jinja2Templates(directory=str(BASE_DIR / "templates"))


@app.get("/")
def index():
    return RedirectResponse(url="/select", status_code=307)


@app.get("/select", response_class=HTMLResponse)
def select_values(request: Request):
    return templates.TemplateResponse("select_value.html", {"request": request})


@app.get("/box", response_class=HTMLResponse)
def box_page(request: Request):
    return templates.TemplateResponse("box.html", {"request": request})


@app.get("/circle", response_class=HTMLResponse)
def circle_page(request: Request):
    return templates.TemplateResponse("circle.html", {"request": request})


# -----------------------------
# Backend-driven configuration
# -----------------------------


class Pattern(BaseModel):
    # seconds for each phase: inhale, hold1, exhale, hold2
    inhale: float = 4.0
    hold1: float = 4.0
    exhale: float = 4.0
    hold2: float = 4.0

    @property
    def total_seconds(self) -> float:
        return float(self.inhale + self.hold1 + self.exhale + self.hold2)

    @field_validator("inhale", "hold1", "exhale", "hold2")
    @classmethod
    def positive(cls, v: float) -> float:
        # allow zero for phases (e.g., triangle 0-3-0-3)
        if v < 0:
            raise ValueError("phase durations must be >= 0")
        return v


class Config(BaseModel):
    box_scale: float = 1.0
    # either fixed cycle or pattern; when pattern provided, cycle_seconds is derived
    cycle_seconds: Optional[float] = None
    pattern: Optional[Pattern] = Pattern()  # default 4-4-4-4 (box)

    # three-phase variant: inhale-hold-exhale
    class ThreePhasePattern(BaseModel):
        inhale: float = 4.0
        hold: float = 4.0
        exhale: float = 4.0

        @property
        def total_seconds(self) -> float:
            return float(self.inhale + self.hold + self.exhale)

        @field_validator("inhale", "hold", "exhale")
        @classmethod
        def non_negative(cls, v: float) -> float:
            if v < 0:
                raise ValueError("phase durations must be >= 0")
            return v

    # two-phase variant: inhale-exhale
    class TwoPhasePattern(BaseModel):
        inhale: float = 4.0
        exhale: float = 4.0

        @property
        def total_seconds(self) -> float:
            return float(self.inhale + self.exhale)

        @field_validator("inhale", "exhale")
        @classmethod
        def non_negative(cls, v: float) -> float:
            if v < 0:
                raise ValueError("phase durations must be >= 0")
            return v

    pattern_three: Optional["Config.ThreePhasePattern"] = None
    pattern_two: Optional["Config.TwoPhasePattern"] = None
    variant: Optional[Literal["box", "three", "two"]] = "box"

    @property
    def effective_cycle_seconds(self) -> float:
        # prefer explicit variant when present
        if self.variant == "three" and self.pattern_three is not None:
            return self.pattern_three.total_seconds
        if self.variant == "two" and self.pattern_two is not None:
            return self.pattern_two.total_seconds
        if self.pattern is not None:
            return self.pattern.total_seconds
        return float(self.cycle_seconds or 16.0)

    @field_validator("box_scale")
    @classmethod
    def valid_scale(cls, v: float) -> float:
        # keep a sensible range similar to UI slider
        if v <= 0:
            raise ValueError("box_scale must be > 0")
        return v


class ConfigUpdate(BaseModel):
    box_scale: Optional[float] = None
    cycle_seconds: Optional[float] = None
    pattern: Optional[Pattern] = None


# In-memory config (replace with DB if needed)
CONFIG = Config()


@app.get("/api/config")
def get_config():
    return {
        "box_scale": CONFIG.box_scale,
        "cycle_seconds": CONFIG.effective_cycle_seconds,
        "pattern": CONFIG.pattern.model_dump() if CONFIG.pattern else None,
        "pattern_three": (
            CONFIG.pattern_three.model_dump() if CONFIG.pattern_three else None
        ),
        "pattern_two": (
            CONFIG.pattern_two.model_dump() if CONFIG.pattern_two else None
        ),
        "variant": CONFIG.variant,
    }


@app.post("/api/config")
def update_config(update: ConfigUpdate):
    global CONFIG
    if update.box_scale is not None:
        CONFIG.box_scale = update.box_scale

    # If pattern provided, it takes precedence and defines cycle seconds
    if update.pattern is not None:
        # validate total > 0
        if update.pattern.total_seconds <= 0:
            raise HTTPException(status_code=400, detail="pattern total must be > 0")
        CONFIG.pattern = update.pattern
        CONFIG.pattern_three = None
        CONFIG.pattern_two = None
        CONFIG.variant = "box"
        CONFIG.cycle_seconds = None
    elif update.cycle_seconds is not None:
        # When using explicit cycle seconds, clear pattern to use equal quarters (frontend)
        CONFIG.cycle_seconds = update.cycle_seconds
        CONFIG.pattern = None
        CONFIG.pattern_three = None
        CONFIG.pattern_two = None
        CONFIG.variant = None

    return get_config()


# -----------------------------
# Separate pattern endpoints
# -----------------------------


@app.get("/api/patterns/box")
def get_box_pattern():
    p = CONFIG.pattern or Pattern()
    return p


class BoxPatternUpdate(Pattern):
    pass


@app.post("/api/patterns/box")
def set_box_pattern(p: BoxPatternUpdate):
    global CONFIG
    if p.total_seconds <= 0:
        raise HTTPException(status_code=400, detail="pattern total must be > 0")
    CONFIG.pattern = p
    CONFIG.pattern_three = None
    CONFIG.pattern_two = None
    CONFIG.variant = "box"
    CONFIG.cycle_seconds = None
    return get_config()


@app.get("/api/patterns/three")
def get_three_pattern():
    p = CONFIG.pattern_three or Config.ThreePhasePattern()
    return p


class ThreePatternUpdate(Config.ThreePhasePattern):
    pass


@app.post("/api/patterns/three")
def set_three_pattern(p: ThreePatternUpdate):
    global CONFIG
    if p.total_seconds <= 0:
        raise HTTPException(status_code=400, detail="pattern total must be > 0")
    CONFIG.pattern_three = p
    CONFIG.pattern = None
    CONFIG.pattern_two = None
    CONFIG.variant = "three"
    CONFIG.cycle_seconds = None
    return get_config()


@app.get("/api/patterns/two")
def get_two_pattern():
    p = CONFIG.pattern_two or Config.TwoPhasePattern()
    return p


class TwoPatternUpdate(Config.TwoPhasePattern):
    pass


@app.post("/api/patterns/two")
def set_two_pattern(p: TwoPatternUpdate):
    global CONFIG
    if p.total_seconds <= 0:
        raise HTTPException(status_code=400, detail="pattern total must be > 0")
    CONFIG.pattern_two = p
    CONFIG.pattern = None
    CONFIG.pattern_three = None
    CONFIG.variant = "two"
    CONFIG.cycle_seconds = None
    return get_config()
