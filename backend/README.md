# Financial Analytics Backend

A FastAPI backend that powers the Financial Analytics mobile app. It provides working capital analysis, banking statement scoring, multi-year trend analysis, AI-powered document parsing, and PDF report generation.

## Features

- **Working Capital Analysis** – MPBF calculations, liquidity ratios, WC cycle
- **Banking Score Analysis** – Credit scoring from bank statement data
- **Multi-Year Trend Analysis** – Growth trends, CAGR, pattern detection
- **AI Document Parsing** – Extract financial data from PDFs/images using Gemini or GPT-4o
- **PDF Report Generation** – Export analysis results as formatted PDF reports
- **Flexible Financial Analysis** – Accept any field names, auto-normalize, generate AI insights
- **MongoDB Storage** – Persist cases and analysis results

## Tech Stack

- **Python 3.11**
- **FastAPI** + **Uvicorn**
- **Motor** (async MongoDB driver)
- **Google Gemini 2.5 Flash** / **OpenAI GPT-4o** (AI document parsing)
- **ReportLab** (PDF generation)

## Quick Start

### 1. Install dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and set your MONGO_URL and GEMINI_API_KEY (or OPENAI_API_KEY)
```

### 3. Run the server

```bash
uvicorn server:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/health` | API health with AI provider info |
| POST | `/api/analysis/wc` | Working capital analysis |
| POST | `/api/analysis/banking` | Banking score analysis |
| POST | `/api/analysis/trend` | Multi-year trend analysis |
| POST | `/api/analysis/financial` | Flexible financial analysis (any field names) |
| POST | `/api/parse/upload` | Parse financial document using AI Vision |
| POST | `/api/export/pdf` | Generate PDF report |
| GET | `/api/cases` | List saved cases |
| POST | `/api/cases` | Save a case |
| GET | `/api/cases/{id}` | Get a case |
| DELETE | `/api/cases/{id}` | Delete a case |
| GET | `/api/dashboard/stats` | Dashboard statistics |

## Docker

```bash
docker build -t financial-backend .
docker run -p 8000:8000 --env-file .env financial-backend
```

## Deployment (Railway)

The `railway.json` and `Procfile` are configured for Railway deployment.
Set environment variables (`MONGO_URL`, `GEMINI_API_KEY`) in the Railway dashboard.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MONGO_URL` | Yes | MongoDB connection string |
| `DB_NAME` | No | Database name (default: `financial_analytics`) |
| `GEMINI_API_KEY` | Recommended | Gemini API key for AI features |
| `AI_INTEGRATIONS_GEMINI_API_KEY` | No | Railway-style Gemini key (takes priority) |
| `OPENAI_API_KEY` | No | OpenAI fallback (images only) |
| `PORT` | No | Server port (default: `8000`) |
