from pydantic import BaseModel
from typing import Optional

class ArticleRequest(BaseModel):
    topic: str
    length: str = "medium"  # short, medium, long
    style: str = "informative"  # informative, creative, technical, casual
    tone: str = "neutral"  # neutral, professional, friendly, authoritative

class ArticleResponse(BaseModel):
    success: bool
    article: Optional[str] = None
    error: Optional[str] = None