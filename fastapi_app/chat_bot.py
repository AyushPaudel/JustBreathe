from fastapi import FastAPI, Body
from pydantic import BaseModel
import openai
import os

app = FastAPI()

# put your API key in env var
openai.api_key = os.getenv("OPENAI_API_KEY")

# your breathing map
mood_breathing_map = [
    {
        "emotion": "Anxious / Stressed",
        "pattern": "Box breathing",
        "timing": {"inhale": 4, "hold": 4, "exhale": 4, "hold_after_exhale": 4},
        "effect": "Calms nervous system, reduces anxiety",
    },
    {
        "emotion": "Calm / Relaxed",
        "pattern": "Extended exhale breathing",
        "timing": {"inhale": 4, "hold": 0, "exhale": 6, "hold_after_exhale": 0},
        "effect": "Promotes parasympathetic activation and relaxation",
    },
    {
        "emotion": "Low energy / Fatigue",
        "pattern": "Short, active breathing",
        "timing": {"inhale": 2, "hold": 0, "exhale": 2, "hold_after_exhale": 0},
        "effect": "Increases alertness and activity, counters sluggishness",
    },
    {
        "emotion": "Focus / Attention",
        "pattern": "Cyclic sighing",
        "timing": {"inhale": 3, "hold": 1, "exhale": 6, "hold_after_exhale": 0},
        "effect": "Enhances attention and mood, reduces respiratory rate",
    },
    {
        "emotion": "Angry / Frustrated",
        "pattern": "Slow inhale-hold-exhale",
        "timing": {"inhale": 4, "hold": 7, "exhale": 8, "hold_after_exhale": 0},
        "effect": "Reduces anger, controls emotional reactions",
    },
    {
        "emotion": "Fear / Panic",
        "pattern": "Slow, deep breathing with equal inhale-exhale",
        "timing": {"inhale": 4, "hold": 0, "exhale": 4, "hold_after_exhale": 0},
        "effect": "Reduces hyperventilation and panic symptoms",
    },
    {
        "emotion": "Sad / Depressed",
        "pattern": "Gentle slow diaphragmatic breathing",
        "timing": {"inhale": 5, "hold": 0, "exhale": 5, "hold_after_exhale": 0},
        "effect": "Improves mood and emotional stability",
    },
    {
        "emotion": "Energized / Excited",
        "pattern": "Fast paced inhale-exhale",
        "timing": {"inhale": 1.5, "hold": 0, "exhale": 1.5, "hold_after_exhale": 0},
        "effect": "Boosts sympathetic activation for energy",
    },
    {
        "emotion": "Sleepy / Drowsy",
        "pattern": "Slow steady breathing",
        "timing": {"inhale": 4, "hold": 0, "exhale": 6, "hold_after_exhale": 0},
        "effect": "Promotes relaxation and sleep readiness",
    },
]


class ChatRequest(BaseModel):
    messages: list[str]


@app.post("/chatbot")
def chatbot(req: ChatRequest):
    """
    Runs an LLM-powered conversation and outputs both the dialogue and breathing exercise mapping.
    """

    # Build system instructions
    system_prompt = f"""
You are a compassionate chatbot. 
- Have a short conversation with the user (8–10 lines max). 
- The conversation should feel casual and empathetic, not like an interview. 
- At the end, analyze the conversation and decide the user’s emotional state.
- You MUST pick one emotion strictly from this list:
{[item["emotion"] for item in mood_breathing_map]}
- Then, return the mapped breathing technique from the given JSON exactly.
- End with: "It seems like you had a very (emotion) kind of day, let's do a quick (pattern) to help you."
- Final output must be JSON with this format:
{{
  "conversation": [... bot responses ...],
  "breathing": {{ ... one breathing map entry ... }}
}}
"""

    # Send conversation + system prompt to LLM
    response = openai.ChatCompletion.create(
        model="gpt-4o-mini",  # can swap for cheaper model
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "\n".join(req.messages)},
        ],
        temperature=0.7,
    )

    # Parse the JSON output from the model
    content = response.choices[0].message["content"]

    return {"result": content}
