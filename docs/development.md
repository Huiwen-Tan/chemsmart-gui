# Development

## Prerequisites

- Node.js 20+
- Python 3.11+

## Install frontend + desktop dependencies

```bash
npm install
```

## Install backend dependencies

```bash
python3.11 -m venv .venv
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

## Frontend tests

TODO: add frontend component/integration tests once the project testing harness (for example Vitest + React Testing Library) is selected.
