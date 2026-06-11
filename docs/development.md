# Development

## Prerequisites

- Node.js 22.12+
- Python 3.10
- CHEMSMART 2.0.0 or newer

## Install frontend + desktop dependencies

```bash
npm install
```

## Install backend dependencies

```bash
python3.10 -m venv .venv
source .venv/bin/activate
pip install -e "apps/backend[dev]"
```

## Run FastAPI backend

```bash
uvicorn chemsmart_gui.main:app --app-dir apps/backend --reload --port 8000
```

## Run Vite frontend

```bash
npm run --workspace apps/frontend dev
```

## Run Electron shell (MVP note)

For MVP, backend runs separately. Electron can load the dev frontend via `VITE_DEV_SERVER_URL` or frontend build output in production.

## Verify the repository

Run the complete current verification baseline from the repository root:

```bash
npm run verify
```

This runs backend tests, frontend tests, frontend typecheck and build, and
desktop typecheck. Run it before completing a development task.
