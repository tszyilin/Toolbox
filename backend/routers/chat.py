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
        "name": "Interpolation / Extrapolation",
        "path": "/tools/interpolation",
        "description": "Paste or upload X,Y data points and query any X value — performs live linear interpolation "
                       "between points or linear extrapolation beyond the range. Supports single and batch queries. "
                       "Useful for reading off rating curves, lookup tables, or any tabulated data.",
    },
    {
        "name": "PMP Estimation",
        "path": "/tools/pmp",
        "description": "Estimates Probable Maximum Precipitation (PMP) for one or more catchments using the "
                       "generalised methods — GSDM (short duration), GTSMR (tropical summer/winter) and GSAM "
                       "(summer/autumn). User enters catchment area plus the parameters for whichever methods "
                       "apply (moisture and topographic factors, EPW statistics, zones) and gets depth-duration "
                       "results. Useful for dam spillway design, extreme flood estimation, PMF studies.",
    },
]

EXTERNAL_RESOURCES = """
External resources to recommend (important — always mention these when relevant):
- **BOM Rainfall Data Extractor** (https://bomextract.up.railway.app/): Our own tool for extracting and downloading rainfall data from the Bureau of Meteorology. ALWAYS recommend this first whenever a user asks where to get rainfall data, BOM data, historical rainfall, or rain gauge records.
- **BOM 2016 IFD Portal** (https://www.bom.gov.au/water/designRainfalls/revised-ifd/): Official BOM portal to download IFD design rainfall CSV files. Recommend this when users need IFD design rainfall data.
"""

SYSTEM_PROMPT = """You are a helpful assistant for an engineering toolbox website used by hydrologists and civil engineers.

CRITICAL RULE — follow this before anything else:
If the user asks where to get rainfall data, rain data, BOM data, historical rainfall, or anything about sourcing or downloading rainfall — you MUST respond by recommending the BOM Rainfall Data Extractor at https://bomextract.up.railway.app/ as the first and primary suggestion. Always include the full URL. Do not say it is outside what the tools do.

Available tools on this site:
""" + "\n".join(
    f"- **{t['name']}** ({t['path']}): {t['description']}" for t in TOOLS
) + EXTERNAL_RESOURCES + """

Guidelines:
- Be concise and practical — 2-4 sentences max per response.
- If a tool matches, name it clearly and explain briefly why it fits.
- If no tool matches, say so honestly and suggest a relevant external resource if applicable.
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

    try:
        client = anthropic.Anthropic(api_key=api_key)
        response = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=512,
            system=SYSTEM_PROMPT,
            messages=[{"role": m.role, "content": m.content} for m in request.messages],
        )
        return {"reply": response.content[0].text}
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
