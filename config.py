import os

# Ollama configuration
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "localhost")
OLLAMA_PORT = os.getenv("OLLAMA_PORT", "11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:latest")

# Application configuration
APP_HOST = "0.0.0.0"
APP_PORT = 5000
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

# Logging configuration
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
