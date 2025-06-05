
<h1 align="center">LLM - ollama - gemma3:latest</h1>
<p align="center">AI Article Generator</p>

## Overview

The **Article Generator** is a web application built with **FastAPI** that leverages local AI models (via **Ollama**) to generate high-quality articles based on user-specified topics, lengths, styles, and tones. The frontend, styled with **Tailwind CSS**, provides an intuitive interface for generating and streaming articles.

This project is ideal for content creators, developers, and AI enthusiasts looking to experiment with local large language models (LLMs).

> **Note**: Information in this README, including dependencies and setup instructions, is based on data available before September 2021, adapted to reflect the current project structure as of **June 5, 2025**.

---

## Features

- ✅ Generate articles with customizable parameters (topic, length, style, tone)
- 🔄 Stream article generation in real-time using server-sent events
- 🩺 Health check endpoint to verify Ollama connectivity
- 🎨 Responsive frontend with Tailwind CSS and Font Awesome
- 🌐 CORS-enabled API for flexible frontend-backend communication
- 📦 Modular endpoint structure using FastAPI routers

---

## Prerequisites

- **Python 3.11.4**: Ensure Python is installed.
- **pip**: Python package manager.
- **virtualenv**: For isolated Python environments.
- **Ollama**: Local LLM server (see setup instructions below).
- **OS**: macOS/Linux/Windows (tested on macOS; should work on other platforms with adjustments).

---

## Downloading and Setting Up Ollama

**Ollama** is a tool for running large language models locally. As of September 2021, similar tools existed, but Ollama is a modern equivalent. Follow these steps to install and use it:

### Installation

**Download Ollama:**

Visit the official Ollama website or repository (refer to the latest documentation post-September 2021 for the exact URL).

- For macOS:
    ```bash
    brew install ollama
    ```

- For Linux, download the binary or use a package manager (check the Ollama GitHub for instructions).
- For Windows, use WSL2 or check for native support in newer releases.


### Verify Installation:
``` bash
ollama --version
```

- This should display the installed version.

- **Pull a Model:** The project uses the gemma3:latest model by default. Pull it:
``` bash
ollama pull gemma3:latest
```

- Alternatively, use llama3 for better compatibility:
``` bash
ollama pull llama3
```

- **Start Ollama Server:** Run the Ollama server in the background:
``` bash
ollama serve
```

- Verify it’s running:
    ``` url
    curl http://localhost:11434/api/tags
    ```

 - **Expected output:**
 ``` json
{
    "models":[
        {
            "name":"gemma3:latest",
            "modified_at":"...",
            "size":...
        }
    ]
}
 ```

## Project Setup
Follow these steps to clone and run the Article Generator project.
1. **Clone the Repository**
``` url
git clone https://github.com/<your-username>/article-generator.git
```
``` bash
cd article-generator
```

2. **Set Up Virtual Environment**
- Create and activate a Python virtual environment:
  ``` bash
  python3 -m venv venv
  ```   
    ``` bash
    source venv/bin/activate
    ```  
    On Windows: 
    ``` bash
    venv\Scripts\activate
    ```
 
3. **Install Dependencies**
    Install the required Python packages:
    ``` bash
    pip install fastapi==0.115.12 uvicorn==0.34.3 httpx==0.28.1 pydantic==2.11.5 langchain==0.3.25
    ```

4. **Configure Environment**
    Update config.py to match your Ollama model:
    ``` python
    import os
    OLLAMA_HOST = os.getenv("OLLAMA_HOST", "localhost")
    OLLAMA_PORT = os.getenv("OLLAMA_PORT", "11434")
    DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "gemma3:latest")  # Or "llama3"
    ```

    Alternatively, set the environment variable:
    ``` bash
    export OLLAMA_MODEL="gemma3:latest"  # Or "llama3"
    ```

5. **Run the Application**
    Start the FastAPI server:
    ``` bash
    uvicorn main:app --host 127.0.0.1 --port 8000
    ```

    Expected output:
    ``` terminal
    INFO:     Started server process [12345]
    INFO:     Waiting for application startup.
    INFO:     Application startup complete.
    INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
    ```

6. **Access the Application**

- **Frontend:** 
    Open ``` http://127.0.0.1:8000/``` in your browser to access the web interface.
- **API Endpoints:**
    - Health Check: curl http://127.0.0.1:8000/api/health
    - Generate Article: curl -X POST http://127.0.0.1:8000/api/generate-article \
    -H "Content-Type: application/json" \
    -d '{"topic":"The Benefits of Artificial Intelligence","length":"medium","style":"informative","tone":"neutral"}'

- **Stream Article:** curl -X POST http://127.0.0.1:8000/api/generate-article-stream ...



## Project Structure
```
article-generator/
├── api/
│   └── endpoints.py       # API routes (/api/health, /api/generate-article, etc.)
├── models/
│   └── article_generator.py  # Article generation logic
├── schema/
│   └── article_schema.py  # Pydantic models for requests/responses
├── static/
│   ├── index.html        # Frontend HTML
│   ├── script.js         # Frontend JavaScript
│   └── style.css         # Custom CSS
├── config.py             # Configuration (Ollama host, port, model)
├── main.py               # FastAPI app entry point
├── README.md             # Project documentation
└── requirements.txt      # Dependencies (optional)

```

## Troubleshooting

``` Frontend Stuck on "Checking connection...":```

- Ensure Ollama is running (curl http://localhost:11434/api/tags).
- Check browser console (F12) for errors.
- Verify http://127.0.0.1:8000/api/health returns:{"status":"healthy","ollama_connected":true,"model":"gemma3:latest"}


## Poor Article Quality:

- **Switch to llama3 model:** 
``` bash
ollama pull llama3
```
``` bash
export OLLAMA_MODEL="llama3"
```

## Contributing
**Contributions are welcome! Please:**

**Fork the repository.**
``` git
Create a feature branch (git checkout -b feature/new-feature).
Commit changes (git commit -m "Add new feature").
Push to the branch (git push origin feature/new-feature).
Open a pull request.
```

## License
This project is licensed under the MIT License. See the LICENSE file for details.
Acknowledgments

**Built with FastAPI and Ollama.**
- Styled with Tailwind CSS and Font Awesome.
- Information retrieved before September 2021, adapted for - current tools as of June 5, 2025.

