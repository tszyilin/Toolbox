from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import os
import anthropic
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/chat", tags=["chat"])

TOOLS = [
    {
        "name": "Equal Area Slope",
        "path": "/tools/equal-area-slope",
        "description": "Calculates equal area slope (EAS) in m/km from surveyed cross-section data. "
                       "User uploads a CSV with a line ID column, elevation column, and distance column. "
                       "Useful for stream/channel characterisation, hydraulic modelling inputs.",
    },
    {
        "name": "IFD Climate Change Adjustment",
        "path": "/tools/ifd-climate-change",
        "description": "Adjusts 2016 Bureau of Meteorology IFD (Intensity-Frequency-Duration) rainfall curves "
                       "for climate change per ARR Book 1 Chapter 6. User uploads a BOM IFD CSV and selects "
                       "SSP scenario (SSP1-2.6, SSP2-4.5, SSP3-7.0, SSP5-8.5), time period (2021-2040, "
                       "2041-2060, 2081-2100), and optionally adjusts loss parameters (IL/CL) by NRM cluster. "
                       "Useful for flood studies, drainage design, infrastructure with long design life.",
    },
]

SYSTEM_PROMPT = """You are a helpful assistant for an engineering toolbox website used by hydrologists and civil engineers.
Your job is to help users identify which tool they should use based on what they describe.

Available tools:
""" + "\n".join(
    f"- **{t['name']}** ({t['path']}): {t['description']}" for t in TOOLS
) + """

Guidelines:
- Be concise and practical — 2-4 sentences max per response.
- If a tool matches, name it clearly and explain briefly why it fits.
- If no tool matches, say so honestly and ask a clarifying question.
- Do not make up tools that don't exist.
- You can suggest the user upload files or fill in parameters once you've identified the right tool.
"""


class Message(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[Message]


@router.post("/")
def chat(request: ChatRequest):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        return JSONResponse(
            status_code=500,
            content={"error": "ANTHROPIC_API_KEY not set on the server."},
        )

    client = anthropic.Anthropic(api_key=api_key)
    response = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=512,
        system=SYSTEM_PROMPT,
        messages=[{"role": m.role, "content": m.content} for m in request.messages],
    )
    return {"reply": response.content[0].text}
