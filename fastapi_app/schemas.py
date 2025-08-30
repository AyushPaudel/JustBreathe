from __future__ import annotations

from typing import Optional, Literal, Dict, Any, List
from pydantic import BaseModel, field_validator


# -----------------------------
# Breathing configuration
# -----------------------------


class Pattern(BaseModel):
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
        if v < 0:
            raise ValueError("phase durations must be >= 0")
        return v


class Config(BaseModel):
    box_scale: float = 1.0
    cycle_seconds: Optional[float] = None
    pattern: Optional[Pattern] = Pattern()

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
        if v <= 0:
            raise ValueError("box_scale must be > 0")
        return v


class ConfigUpdate(BaseModel):
    box_scale: Optional[float] = None
    cycle_seconds: Optional[float] = None
    pattern: Optional[Pattern] = None


# -----------------------------
# Chat schemas
# -----------------------------


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model: Optional[str] = "gpt-4o-mini"
    temperature: Optional[float] = 0.3
    max_tokens: Optional[int] = 512


class ChatResponse(BaseModel):
    reply: str
    model: Optional[str] = None
    usage: Optional[Dict[str, Any]] = None
