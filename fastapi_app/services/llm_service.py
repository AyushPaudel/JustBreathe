from __future__ import annotations

import os
from pathlib import Path
from typing import Optional, List, Dict, Any
import json

import httpx

from schemas import ChatRequest, ChatResponse, ChatMessage
from data.breathing_map import MOOD_BREATHING_MAP


class LLMService:
    def __init__(self, base_dir: Path, model: str = "gpt-4o-mini") -> None:
        self.base_dir = base_dir
        self.model_default = model
        self.api_key = os.getenv("OPENAI_API_KEY")
        self._system_prompt = None

    def load_prompt(self) -> str:
        if self._system_prompt is not None:
            return self._system_prompt
        # Prefer companion prompt if available
        companion = self.base_dir / "PROMPT_COMPANION.txt"
        prompt_path = (
            companion if companion.exists() else (self.base_dir / "PROMPT.txt")
        )
        if prompt_path.exists():
            self._system_prompt = prompt_path.read_text(encoding="utf-8").strip()
        else:
            self._system_prompt = (
                "You are a calm, supportive breathing coach. Keep answers short, warm, and actionable. "
                "Prefer simple guidance like box (4-4-4-4), 4-7-8, or equal inhale/exhale. Avoid therapy claims."
            )
        return self._system_prompt

    async def chat(self, req: ChatRequest) -> ChatResponse:
        if not self.api_key:
            # Offline companion: brief empathetic response and only recommend when user seems ready
            user_msgs = [m.content.lower() for m in req.messages if m.role == "user"]
            last_user = user_msgs[-1] if user_msgs else ""
            wants_plan = (
                any(
                    k in last_user
                    for k in [
                        "recommend",
                        "suggest",
                        "ready",
                        "start",
                        "go ahead",
                        "plan",
                    ]
                )
                or len(user_msgs) >= 2
            )
            if wants_plan:
                # Pick a simple default and emit a detectable plan line
                plan = {
                    "emotion": "Calm / Relaxed",
                    "pattern": "Box breathing",
                    "type": "4 point",
                    "timing": {
                        "inhale": 4,
                        "hold": 4,
                        "exhale": 4,
                        "hold_after_exhale": 4,
                    },
                    "effect": "Calms nervous system, reduces anxiety",
                    "quote": "Breathe gently; you’re not alone.",
                }
                plan_json = json.dumps(plan, separators=(",", ":"))
                reply = (
                    "We can ground together with box breathing."
                    f"\nPLAN_JSON: {plan_json}\nI'll set that up now."
                )
            else:
                reply = "I'm here with you. That sounds like a lot. What would you like to feel right now?"
            return ChatResponse(reply=reply, model="coach-local")

        system_prompt = self.load_prompt()
        messages: List[ChatMessage] = [
            ChatMessage(role="system", content=system_prompt)
        ] + req.messages

        payload = {
            "model": req.model or self.model_default,
            "messages": [m.model_dump() for m in messages],
            "temperature": req.temperature,
            "max_tokens": req.max_tokens,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            r.raise_for_status()
            data = r.json()
            reply = data["choices"][0]["message"]["content"].strip()
            usage = data.get("usage")
        return ChatResponse(reply=reply, model=payload["model"], usage=usage)

    async def conversation_to_breathing(self, lines: List[str]) -> Dict[str, Any]:
        """Implements chat_bot.py behavior: take a short conversation and ask the model to output JSON
        with a conversation and one mapped breathing technique from MOOD_BREATHING_MAP.
        Falls back to a simple heuristic if no API key.
        """
        emotions = [item["emotion"] for item in MOOD_BREATHING_MAP]
        system_prompt = (
            "You are a compassionate chatbot.\n"
            "- Have a short conversation with the user (8–10 lines max).\n"
            "- The conversation should feel casual and empathetic, not like an interview.\n"
            "- At the end, analyze the conversation and decide the user’s emotional state.\n"
            f"- You MUST pick one emotion strictly from this list:\n{emotions}\n"
            "- Then, return the mapped breathing technique from the given JSON exactly.\n"
            '- End with: "It seems like you had a very (emotion) kind of day, let\'s do a quick (pattern) to help you."\n'
            "- Final output must be JSON with this format:\n"
            '{\n  "conversation": [... bot responses ...],\n  "breathing": { ... one breathing map entry ... }\n}\n'
        )

        if not self.api_key:
            # naive heuristic: if 'sleep' appears, pick Sleepy; if 'stress' pick Anxious; else calm
            text = "\n".join(lines).lower()
            chosen = MOOD_BREATHING_MAP[0]
            for item in MOOD_BREATHING_MAP:
                key = item["emotion"].split("/")[0].strip().lower()
                if key in text:
                    chosen = item
                    break
            return {
                "conversation": [
                    "I’m here with you. Let’s take a gentle breath together.",
                    "Would you like to try box breathing or a slower exhale today?",
                    "It seems like you had a very {} kind of day, let's do a quick {} to help you.".format(
                        chosen["emotion"], chosen["pattern"]
                    ),
                ],
                "breathing": chosen,
            }

        payload = {
            "model": self.model_default,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": "\n".join(lines)},
            ],
            "temperature": 0.7,
        }
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                "https://api.openai.com/v1/chat/completions",
                json=payload,
                headers=headers,
            )
            r.raise_for_status()
            data = r.json()
            content = data["choices"][0]["message"]["content"]
        # Let the caller parse JSON; here we just return a minimal wrapper
        return {"result": content}
