# Spur AI Support Agent Simulator

This project is a mini customer support AI agent integrated into a modern e-commerce storefront mockup. It features a TypeScript Express backend connected to a SQLite database via Prisma, and a React + TypeScript frontend styled with Tailwind CSS v3.

The AI assistant reads official store policies (FAQ) dynamically seeded into the database, references recent conversation history (capped at last 10 messages), and generates answers utilizing Gemini, OpenAI, or Claude.

---

## 🛠️ Architecture Overview

The codebase is split into two primary components:

### 1. Backend (`backend/`)
Built with Node.js, Express, TypeScript, and Prisma ORM + SQLite:
* **`src/index.ts`**: Express application entry point. Performs database connectivity checks, runs an automatic database seed of FAQ content if empty, and spins up the server.
* **`src/config/env.ts`**: Handles environment variables via `dotenv` and parses which LLM key is configured in order of priority (Gemini, OpenAI, Anthropic).
* **`src/db/client.ts`**: Exports the unified Prisma Client instance.
* **`src/services/llmService.ts`**: Selects client configuration based on environment keys, constructs formatted contents (with roles), limits response tokens (`max_tokens: 500`), sets request timeouts (15 seconds), and provides friendly user-facing messages for rates, auth, or service exceptions.
* **`src/services/chatService.ts`**: Manages user conversations and message storage, retrieves the last 10 messages for contextual memory, pulls policies from the DB, and binds system prompt instructions.
* **`src/controllers/chatController.ts`**: Runs API entry validations. Sanitizes payloads, rejects empty inputs, truncates messages over 1000 characters, and protects the server from crashing by routing exceptions to clean JSON error replies.
* **`src/routes/chatRoutes.ts`**: Maps endpoints `/api/chat/message` and `/api/chat/history/:sessionId`.

### 2. Frontend (`frontend/`)
Built with React 19, TypeScript, Vite, and Tailwind CSS v3:
* **`src/App.tsx`**: Renders a mockup of a minimalist storefront named "Spur Goods" containing navigations, banners, feature catalogs, and floats the launcher widget.
* **`src/components/ChatWidget.tsx`**: Interactive chat interface. Houses toggle layouts, local storage session retention, character limit count notifications, in-flight state disabling, pulsing "typing..." actions, and retry banners for error states.
* **`src/index.css`**: Configures Tailwind imports, modern fonts (Plus Jakarta Sans), custom bounce animations, scrollbar overlays, and slide-up bubble entry motions.

---

## 🚀 Step-by-Step Local Setup

### 1. Prerequisites
Ensure you have **Node.js (v18 or higher)** and **npm** installed:
* `node -v`
* `npm -v`

### 2. Install Dependencies
Run the workspace-level installation script from the root project directory to install dependencies for root, backend, and frontend:
```bash
npm run install:all
```

### 3. Configure Environment Variables
1. Navigate to the `backend/` directory.
2. Copy the `.env.example` file and rename it to `.env`:
   ```bash
   cp .env.example .env
   ```
3. Open the `.env` file and insert at least one LLM API key. (Setting up one key is sufficient; the system will detect it and use it):
   * `GEMINI_API_KEY`: Google Gemini Key (Recommended, using model `gemini-2.5-flash`)
   * `OPENAI_API_KEY`: OpenAI Key (Using model `gpt-4o-mini`)
   * `ANTHROPIC_API_KEY`: Anthropic Key (Using model `claude-3-haiku`)

### 4. Setup Database (Prisma Migrations & Seeding)
1. Run migrations to initialize the SQLite database (`backend/prisma/dev.db`):
   ```bash
   npm run prisma:migrate
   ```
2. (Optional) The backend auto-seeds itself on launch if the DB is empty. However, you can force-run the seed script manually to check FAQ records:
   ```bash
   npm run prisma:seed
   ```

### 5. Running the Application
Run the concurrent dev command from the root directory:
```bash
npm run dev
```
This spins up:
* **Backend API**: `http://localhost:3000`
* **Frontend Web App**: `http://localhost:5173` (Vite dev proxy forwards `/api` calls automatically to backend)

Open your browser to `http://localhost:5173` to interact with the mock storefront and floating chat widget.

---

## 🤖 LLM Details & Prompting Design

### Priority Client Routing
To ease testing across environments, the backend checks for API keys in the following order:
1. **Gemini** (`gemini-2.5-flash`) - fast and cost-effective.
2. **OpenAI** (`gpt-4o-mini`) - standard support helper.
3. **Anthropic** (`claude-3-haiku`) - conversational assistant.

If no keys are found, it falls back to **Developer Fallback Mode**, which displays an inline interactive guide in the chat telling you how to set up your `.env` variables without crashing or throwing server errors.

### Prompt System Design
The system prompt coordinates store details and strict instructions:
1. **FAQ Injection**: Reads the database categories (`store_info`, `shipping_policy`, `return_policy`, `support_hours`) and formats them into an easily parseable context blocks.
2. **Guardrails**: Instructs the assistant to decline unrelated inquiries (general knowledge, coding requests, general conversation) and politely state it can only help with Spur Goods policies.
3. **Escalation Fallback**: Advises the LLM to suggest emailing `support@spurgoods.com` if questions cannot be resolved by standard FAQs.

---

## 🛡️ Robustness, Validation, & Safety Checks

1. **Empty Message Guard**: Rejecting messages with whitespace-only. Handled both frontend (button disabled) and backend (Express middleware returns `400 Bad Request`).
2. **Oversized Message Truncation**: Inputs exceeding 1000 characters are truncated with an appended notice (`... [truncated for chat limits]`) to keep LLM context inputs clean and prevent prompt injection buffer overflows, without breaking user flows.
3. **Active State Disabling**: Disables text inputs and buttons while query requests are in flight, preventing duplicate submissions.
4. **Crash Prevention**: All controllers and API gateways use Try/Catch middlewares. Unhandled DB locks, LLM key invalidation, or client timeout errors return status `500` or `504` JSON exceptions, preventing Node.js process crashes.
5. **No Hard-coded Secrets**: Clean separation using `.env` (gitignored).

---

## ⚖️ Trade-offs & "If I had more time..."

1. **Prisma vs. Direct SQLite Driver**: Prisma was selected because it generates TypeScript interfaces and schemas, reducing boilerplate. If file size was a major issue, a simple `sqlite3` or `better-sqlite3` raw driver would be lightweight.
2. **Text Chunking / Vector Store (RAG)**: For a mini customer support agent, seeding FAQs directly into the LLM system prompt is extremely fast, low-cost, and reliable. However, if the store policies grew to thousands of articles, a vector database (e.g. Pinecone/Chroma) and a semantic embedding search would be required to retrieve relevant context chunks before calling the LLM.
3. **Streaming Responses**: Currently, the backend awaits the full LLM reply and returns a REST payload. A nicer UX would use Server-Sent Events (SSE) or WebSockets to stream the reply character-by-character to the React frontend in real-time.
4. **LLM Cost Tracking**: In production, it would be useful to record token usage (`prompt_tokens`, `completion_tokens`) for each session in the `Message` model database columns to run analytics on customer support costs.
