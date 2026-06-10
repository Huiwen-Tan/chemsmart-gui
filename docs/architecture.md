# Architecture

## Role in CHEMSMART ecosystem

- `chemsmart-gui` is the desktop GUI/client layer.
- CHEMSMART remains the single source of truth for chemistry logic, parsing, analysis, and job-management behavior.
- The GUI backend exposes stable API/service boundaries and delegates chemistry internals through adapters.

## Layering

- **Frontend (React + Three.js):** UI state, molecular viewer, and user interaction.
- **Backend (FastAPI):** API routing, document/service orchestration, and plugin contracts.
- **Adapter layer:** isolates future direct CHEMSMART integration so UI code never imports CHEMSMART internals.
- **Shared schemas:** JSON schema contracts for payloads exchanged between the
  backend and frontend.

## Extensibility

The starter architecture is intentionally plugin-friendly and prepares for future capabilities:

- molecular visualization enhancements and editing tools,
- vibrational/frequency analysis display,
- optimization trajectories and spectra,
- local/HPC job monitoring and submission,
- CHEMSMART database browsing.
