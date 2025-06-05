import asyncio
import httpx
import json
from typing import AsyncGenerator, List, Optional
from langchain.prompts import PromptTemplate
from langchain.schema import BaseOutputParser
import logging
from config import OLLAMA_HOST, OLLAMA_PORT, DEFAULT_MODEL

logger = logging.getLogger(__name__)

class ArticleOutputParser(BaseOutputParser):
    """Custom output parser for article generation"""
    
    def parse(self, text: str) -> str:
        # Clean up the generated text
        lines = text.strip().split('\n')
        cleaned_lines = []
        
        for line in lines:
            line = line.strip()
            if line and not line.startswith('Human:') and not line.startswith('Assistant:'):
                cleaned_lines.append(line)
        
        return '\n\n'.join(cleaned_lines)

class ArticleGenerator:
    def __init__(self):
        self.ollama_url = f"http://{OLLAMA_HOST}:{OLLAMA_PORT}"
        self.model = DEFAULT_MODEL
        self.parser = ArticleOutputParser()
        
        # Define prompts for different article types
        self.prompt_templates = {
            "informative": PromptTemplate(
                input_variables=["topic", "length_instruction", "tone_instruction"],
                template="""Write an informative article about {topic}. 
                
{length_instruction}

{tone_instruction}

Structure the article with:
- A compelling introduction
- Well-organized main points with clear headings
- Supporting details and examples
- A strong conclusion

Make sure the content is accurate, well-researched, and engaging for readers.

Article:"""
            ),
            "creative": PromptTemplate(
                input_variables=["topic", "length_instruction", "tone_instruction"],
                template="""Write a creative and engaging article about {topic}.

{length_instruction}

{tone_instruction}

Use storytelling techniques, metaphors, and creative language to make the topic come alive. Include:
- An attention-grabbing opening
- Vivid descriptions and examples
- Personal anecdotes or scenarios when appropriate
- A memorable conclusion

Article:"""
            ),
            "technical": PromptTemplate(
                input_variables=["topic", "length_instruction", "tone_instruction"],
                template="""Write a technical article about {topic}.

{length_instruction}

{tone_instruction}

The article should be:
- Technically accurate and detailed
- Well-structured with clear sections
- Include relevant technical concepts and terminology
- Provide practical insights and applications
- Be accessible to the target technical audience

Article:"""
            ),
            "casual": PromptTemplate(
                input_variables=["topic", "length_instruction", "tone_instruction"],
                template="""Write a casual, conversational article about {topic}.

{length_instruction}

{tone_instruction}

Write in a friendly, approachable tone as if talking to a friend. Include:
- A warm, welcoming introduction
- Easy-to-understand explanations
- Personal touches and relatable examples
- A conversational conclusion

Article:"""
            )
        }
        
        self.length_instructions = {
            "short": "Write a concise article of approximately 300-500 words.",
            "medium": "Write a comprehensive article of approximately 800-1200 words.",
            "long": "Write a detailed, in-depth article of approximately 1500-2500 words."
        }
        
        self.tone_instructions = {
            "neutral": "Maintain an objective, balanced tone throughout the article.",
            "professional": "Use a formal, professional tone suitable for business or academic contexts.",
            "friendly": "Write in a warm, approachable, and friendly tone.",
            "authoritative": "Write with confidence and authority, establishing expertise on the topic."
        }

    async def check_ollama_connection(self) -> bool:
        """Check if Ollama is running and accessible"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.ollama_url}/api/tags")
                return response.status_code == 200
        except Exception as e:
            logger.error(f"Ollama connection check failed: {str(e)}")
            return False

    async def get_available_models(self) -> List[str]:
        """Get list of available models from Ollama"""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(f"{self.ollama_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    return [model["name"] for model in data.get("models", [])]
                return []
        except Exception as e:
            logger.error(f"Failed to get available models: {str(e)}")
            return []

    def _build_prompt(self, topic: str, length: str, style: str, tone: str) -> str:
        """Build the prompt based on parameters"""
        template = self.prompt_templates.get(style, self.prompt_templates["informative"])
        length_instruction = self.length_instructions.get(length, self.length_instructions["medium"])
        tone_instruction = self.tone_instructions.get(tone, self.tone_instructions["neutral"])
        
        return template.format(
            topic=topic,
            length_instruction=length_instruction,
            tone_instruction=tone_instruction
        )

    async def generate_article(self, topic: str, length: str = "medium", 
                             style: str = "informative", tone: str = "neutral") -> str:
        """Generate a complete article"""
        try:
            prompt = self._build_prompt(topic, length, style, tone)
            
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "top_k": 40,
                    "repeat_penalty": 1.1
                }
            }
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    f"{self.ollama_url}/api/generate",
                    json=payload
                )
                
                if response.status_code == 200:
                    result = response.json()
                    raw_article = result.get("response", "")
                    return self.parser.parse(raw_article)
                else:
                    raise Exception(f"Ollama API error: {response.status_code}")
                    
        except Exception as e:
            logger.error(f"Article generation failed: {str(e)}")
            raise Exception(f"Failed to generate article: {str(e)}")

    async def generate_article_stream(self, topic: str, length: str = "medium",
                                    style: str = "informative", tone: str = "neutral") -> AsyncGenerator[str, None]:
        """Generate article with streaming response"""
        try:
            prompt = self._build_prompt(topic, length, style, tone)
            
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": True,
                "options": {
                    "temperature": 0.7,
                    "top_p": 0.9,
                    "top_k": 40,
                    "repeat_penalty": 1.1
                }
            }
            
            async with httpx.AsyncClient(timeout=120.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.ollama_url}/api/generate",
                    json=payload
                ) as response:
                    if response.status_code == 200:
                        async for line in response.aiter_lines():
                            if line.strip():
                                try:
                                    chunk_data = json.loads(line)
                                    if "response" in chunk_data:
                                        yield chunk_data["response"]
                                    if chunk_data.get("done", False):
                                        break
                                except json.JSONDecodeError:
                                    continue
                    else:
                        raise Exception(f"Ollama API error: {response.status_code}")
                        
        except Exception as e:
            logger.error(f"Streaming article generation failed: {str(e)}")
            raise Exception(f"Failed to generate article stream: {str(e)}")
