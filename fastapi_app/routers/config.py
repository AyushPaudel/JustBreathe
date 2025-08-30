from __future__ import annotations

from fastapi import APIRouter, HTTPException

from schemas import Config, Pattern, ConfigUpdate

router = APIRouter()


CONFIG = Config()


@router.get("/config")
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


@router.post("/config")
def update_config(update: ConfigUpdate):
    global CONFIG
    if update.box_scale is not None:
        CONFIG.box_scale = update.box_scale

    if update.pattern is not None:
        if update.pattern.total_seconds <= 0:
            raise HTTPException(status_code=400, detail="pattern total must be > 0")
        CONFIG.pattern = update.pattern
        CONFIG.pattern_three = None
        CONFIG.pattern_two = None
        CONFIG.variant = "box"
        CONFIG.cycle_seconds = None
    elif update.cycle_seconds is not None:
        CONFIG.cycle_seconds = update.cycle_seconds
        CONFIG.pattern = None
        CONFIG.pattern_three = None
        CONFIG.pattern_two = None
        CONFIG.variant = None

    return get_config()


@router.get("/patterns/box")
def get_box_pattern():
    p = CONFIG.pattern or Pattern()
    return p


class BoxPatternUpdate(Pattern):
    pass


@router.post("/patterns/box")
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


@router.get("/patterns/three")
def get_three_pattern():
    p = CONFIG.pattern_three or Config.ThreePhasePattern()
    return p


class ThreePatternUpdate(Config.ThreePhasePattern):
    pass


@router.post("/patterns/three")
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


@router.get("/patterns/two")
def get_two_pattern():
    p = CONFIG.pattern_two or Config.TwoPhasePattern()
    return p


class TwoPatternUpdate(Config.TwoPhasePattern):
    pass


@router.post("/patterns/two")
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
