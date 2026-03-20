# Node.js RAG Exercise

A Node.js backend that combines **RAG (Retrieval-Augmented Generation)**, **conversational chat**, and **IoT sensor monitoring** via MQTT. Built with LangChain, Ollama, Qdrant, and MongoDB.

---

## Stack

| Component     | Technology              |
| ------------- | ----------------------- |
| Runtime       | Node.js                 |
| LLM inference | Ollama (phi4-mini:3.8b) |
| Embeddings    | mxbai-embed-large       |
| Vector store  | Qdrant                  |
| Database      | MongoDB                 |
| MQTT broker   | Eclipse Mosquitto       |
| Framework     | Express                 |

---

## Architecture

```
Client
  │
  ▼
Express API (port 3000)
  ├── POST   /session        → create conversation session
  ├── POST   /document       → upload & ingest documents into Qdrant
  ├── DELETE /document/:name → delete document from MongoDB and Qdrant
  └── POST   /interaction    → ask a question (selects pipeline by type)
        ├── chat             → plain LLM conversation
        ├── rag              → semantic retrieval from documents
        ├── rag-rephrasing   → rag + automatic query rewriting
        └── garden-assistant → real-time sensor data from MQTT/MongoDB

MQTT Consumer
  └── subscribes to temperature / humidity topics
  └── stores readings in MongoDB
```

---

## RAG Pipeline Types

### `chat`

Plain conversational LLM with memory. No document retrieval. Use for general questions or when no knowledge base is needed.

### `rag`

Standard RAG pipeline:

1. Embeds the user question
2. Retrieves the top-N most relevant chunks from Qdrant
3. Injects the chunks as context into the LLM prompt
4. Responds grounded strictly on the retrieved documents

### `rag-rephrasing`

RAG with query rewriting:

1. A lightweight rewriter model (low temperature) reformulates the question into a search-optimized query — resolves pronouns, expands references from conversation history
2. Uses the rewritten query for semantic retrieval
3. Passes the original question (not the rewritten one) to the LLM for a natural answer
4. Returns `rewrittenQuestion` in the response for debugging

Best used when users ask follow-up questions like _"and for the other one?"_ or _"what about peppers?"_

### `garden-assistant`

Sensor-aware pipeline for vegetable garden monitoring:

1. Fetches the latest temperature and humidity readings from MongoDB (collected via MQTT)
2. Injects the sensor values directly into the system prompt
3. If a sensor value is `NA` (no data received), the LLM is instructed to say so explicitly
4. If values are present, the LLM **must** use them — it will not claim it cannot access sensor data

---

## Setup & Start

### Prerequisites

- Docker & Docker Compose
- NVIDIA GPU (optional, for GPU acceleration)

### GPU support (optional)

By default the GPU section in `docker-compose.yaml` is commented out and Ollama runs on CPU.
If you have an NVIDIA GPU, uncomment the following block inside the `ollama` service:

```yaml
deploy:
  resources:
    reservations:
      devices:
        - driver: nvidia
          count: all
          capabilities: [gpu]
```

### 1. Configure environment

Copy the example file and edit it as needed:

**Linux / macOS:**

```bash
cp .env.example .env
```

**Windows:**

```powershell
Copy-Item .env.example .env
```

Open `.env` and adjust values if needed (timezone, log level, model names).

### 2. Start infrastructure

```bash
docker compose up -d
```

This starts: MongoDB, Mongo Express, Qdrant, Ollama, Mosquitto, and the backend.

### 2. Initialize (pull models + create DB collections/indexes)

**Windows:**

```powershell
.\init.ps1
```

**Linux / macOS:**

```bash
chmod +x init.sh
./init.sh
```

The script:

- Waits for MongoDB and Ollama to be ready
- Creates collections (`sessions`, `interactions`, `documents`, `humidityEvents`, `temperatureEvents`) and indexes
- Pulls `mxbai-embed-large`, `phi4-mini:3.8b`

### 3. Verify

```bash
curl http://localhost:3000/health
# → { "status": "ok" }
```

---

## API Reference

### Health check

```
GET /health
```

---

### Create session

```
POST /session
```

**Response `201`:**

```json
{ "sessionId": "67eb1a2f3c4d5e6f7a8b9c0d" }
```

Use `sessionId` in subsequent `/interaction` calls to maintain conversation history.

---

### Upload document

```
POST /document
Content-Type: multipart/form-data
```

| Field          | Type   | Required | Description                                                         |
| -------------- | ------ | -------- | ------------------------------------------------------------------- |
| `file`         | File   | yes      | PDF (`application/pdf`) or plain text (`text/plain`) file to ingest |
| `chunkSize`    | number | no       | Override default chunk size                                         |
| `chunkOverlap` | number | no       | Override default chunk overlap                                      |

**Response `201`:**

```json
{
  "id": "67eb1a2f3c4d5e6f7a8b9c0d",
  "name": "document.pdf",
  "stats": {
    "pages": 12,
    "rawChunks": 85,
    "filteredChunks": 80,
    "ingestedChunks": 80
  }
}
```

---

### Delete document

```
DELETE /document/:name
```

| Param  | Type   | Required | Description                                 |
| ------ | ------ | -------- | ------------------------------------------- |
| `name` | string | yes      | Exact document name (as returned by upload) |

Deletes the document record from MongoDB **and** all associated vector chunks from Qdrant.

**Response `200`:**

```json
{ "message": "Document deleted successfully", "name": "document.pdf" }
```

**Response `404`** if the document does not exist.

---

### Ask a question

```
POST /interaction
Content-Type: application/json
```

| Field       | Type   | Required | Description                                                                              |
| ----------- | ------ | -------- | ---------------------------------------------------------------------------------------- |
| `question`  | string | yes      | The user's question                                                                      |
| `type`      | string | yes      | Pipeline type: `chat`, `rag`, `rag-rephrasing`, `garden-assistant`                       |
| `sessionId` | string | no       | Session ID for conversation history. If omitted, a new session is created automatically. |

**Example — RAG with rephrasing:**

```json
{
  "sessionId": "67eb1a2f3c4d5e6f7a8b9c0d",
  "question": "and what about watering frequency?",
  "type": "rag-rephrasing"
}
```

**Response `200`:**

```json
{
  "sessionId": "67eb1a2f3c4d5e6f7a8b9c0d",
  "question": "and what about watering frequency?",
  "answer": "Tomatoes should be watered every 2-3 days...",
  "rewrittenQuestion": "recommended watering frequency for tomatoes",
  "chunks": [...]
}
```

**Example — Garden sensors:**

```json
{
  "sessionId": "67eb1a2f3c4d5e6f7a8b9c0d",
  "question": "what are the current temperature and humidity values?",
  "type": "garden-assistant"
}
```

**Response `200`:**

```json
{
  "sessionId": "67eb1a2f3c4d5e6f7a8b9c0d",
  "question": "what are the current temperature and humidity values?",
  "answer": "Soil temperature is currently 22.9°C, which is within the optimal range...",
  "sensors": {
    "temperature": "22.94°C 2026-03-19T17:08:05.160Z",
    "humidity": "85.44% 2026-03-19T17:08:05.162Z"
  }
}
```

---

## Monitoring

| Service          | URL                             |
| ---------------- | ------------------------------- |
| Backend          | http://localhost:3000           |
| Mongo Express    | http://localhost:8081           |
| Qdrant Dashboard | http://localhost:6333/dashboard |
| Ollama API       | http://localhost:11434          |
