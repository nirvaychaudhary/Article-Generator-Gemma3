from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
import json
from models.article_generator import ArticleGenerator
from config import DEFAULT_MODEL
from schema.article_schema import ArticleRequest, ArticleResponse
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize article generator
article_generator = ArticleGenerator()

@router.get("/health")
async def health_check():
    """Check if the service and Ollama are healthy"""
    try:
        is_healthy = await article_generator.check_ollama_connection()
        return {
            "status": "healthy" if is_healthy else "unhealthy",
            "ollama_connected": is_healthy,
            "model": DEFAULT_MODEL
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        return {
            "status": "unhealthy",
            "ollama_connected": False,
            "error": str(e)
        }

@router.post("/generate-article", response_model=ArticleResponse)
async def generate_article(request: ArticleRequest):
    """Generate an article based on the provided parameters"""
    try:
        # Validate input
        if not request.topic.strip():
            raise HTTPException(status_code=400, detail="Topic cannot be empty")
        
        # Check Ollama connection
        if not await article_generator.check_ollama_connection():
            raise HTTPException(
                status_code=503, 
                detail="Cannot connect to Ollama. Please ensure Ollama is running locally."
            )
        
        # Generate article
        article = await article_generator.generate_article(
            topic=request.topic,
            length=request.length,
            style=request.style,
            tone=request.tone
        )
        
        return ArticleResponse(success=True, article=article)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Article generation failed: {str(e)}")
        return ArticleResponse(
            success=False, 
            error=f"Failed to generate article: {str(e)}"
        )

@router.post("/generate-article-stream")
async def generate_article_stream(request: ArticleRequest):
    """Generate an article with streaming response"""
    try:
        # Validate input
        if not request.topic.strip():
            raise HTTPException(status_code=400, detail="Topic cannot be empty")
        
        # Check Ollama connection
        if not await article_generator.check_ollama_connection():
            raise HTTPException(
                status_code=503, 
                detail="Cannot connect to Ollama. Please ensure Ollama is running locally."
            )
        
        async def generate():
            try:
                async for chunk in article_generator.generate_article_stream(
                    topic=request.topic,
                    length=request.length,
                    style=request.style,
                    tone=request.tone
                ):
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            finally:
                yield "data: {\"done\": true}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "Access-Control-Allow-Origin": "*",
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Streaming article generation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/models")
async def get_available_models():
    """Get list of available Ollama models"""
    try:
        models = await article_generator.get_available_models()
        return {"models": models}
    except Exception as e:
        logger.error(f"Failed to get models: {str(e)}")
        return {"models": [], "error": str(e)}