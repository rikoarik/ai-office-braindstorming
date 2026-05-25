# AI Office / AI Factory

An AI-driven multi-agent project workspace where you can simulate development pipelines, manage projects, and convert documents using AI agents. Built with Node.js/Express (Backend) and React/TypeScript/Vite (Frontend).

## Project Structure

```text
├── client/                 # Frontend React application (Vite, TS)
├── data/                   # Local database storage (SQLite)
├── public/                 # Static files for the server
├── src/                    # Backend source code
│   ├── prompts/            # Agent personality templates (PM, QA, UX, etc.)
│   ├── routes/             # Express API endpoints
│   ├── utils/              # Conversion utilities (Office, Markdown)
│   ├── aiWorker.js         # AI processing execution worker
│   ├── db.js               # Database connection and setup
│   ├── sse.js              # Server-Sent Events for real-time progress
│   └── stateMachine.js     # State machine to manage step executions
├── .env.example            # Environment template configuration
├── .gitignore              # Git ignore rules
├── package.json            # Backend package definitions
└── server.js               # Express application entrypoint
```

## Getting Started

### 1. Prerequisites
- **Node.js** (v18 or higher recommended)
- **npm** (comes with Node.js)
- **9router API Key**

### 2. Installation & Setup

#### Backend Setup
1. Copy the `.env.example` file to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and configure your credentials:
   - `NINER_ROUTER_URL`: The proxy URL for your OpenAI-compatible API endpoint (defaults to local/9router address).
   - `NINER_ROUTER_KEY`: Your 9router dashboard API key.
   - `AI_MODEL`: The model name you want to use.
3. Install backend dependencies:
   ```bash
   npm install
   ```
4. Start the server:
   ```bash
   node server.js
   ```
   The backend will be running at [http://localhost:3000](http://localhost:3000).

#### Frontend Setup
1. Open a new terminal window and navigate to the `client` directory:
   ```bash
   cd client
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The frontend will be running at the URL shown in your terminal (usually [http://localhost:5173](http://localhost:5173)).

## Key Features

- **Multi-Agent Simulation**: Define agent workflows involving roles like Project Manager, QA Engineer, UX designer, Reviewer, and Academic roles.
- **Real-Time Streaming**: Uses Server-Sent Events (SSE) to update the client instantly on the progress of each pipeline task.
- **SQLite Storage**: Efficient project tracking using `better-sqlite3`.
- **Office Converters**: Includes custom converters for office formats (docx, xlsx, pptx) and Markdown files.
