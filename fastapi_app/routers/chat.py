from __future__ import annotations

from fastapi import APIRouter, HTTPException, Body

from schemas import ChatRequest
from services.llm_service import LLMService
from pathlib import Path

router = APIRouter()


@router.post("/chat")
async def chat(req: ChatRequest):
    try:
        base_dir = Path(__file__).resolve().parent.parent
        service = LLMService(base_dir=base_dir)
        res = await service.chat(req)
        return res.model_dump()
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))


class ConversationRequest(ChatRequest):
    messages: list[str]


@router.post("/chatbot")
async def chatbot(messages: list[str] = Body(..., embed=True)):
    try:
        base_dir = Path(__file__).resolve().parent.parent
        service = LLMService(base_dir=base_dir)
        res = await service.conversation_to_breathing(messages)
        return res
    except Exception as e:  # noqa: BLE001
        raise HTTPException(status_code=500, detail=str(e))
