# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

ChainForge is a visual, node-graph environment for prompt engineering and LLM evaluation. Two parts live in one repo:

- **`chainforge/`** — the Python package (Flask server + CLI). Entry point `chainforge = chainforge.app:main`; `chainforge serve` runs `flask_app.py`.
- **`chainforge/react-server/`** — the React/TypeScript frontend (Create React App via craco). This is where almost all application logic lives.

## Commands

All frontend commands run from `chainforge/react-server/`:

- **Dev server:** `npm start` — CRA dev server on **port 3000** with hot reload. Note: the `start`/`build`/`test` npm scripts are prefixed with `npx prettier -w . && npx eslint .`, so they auto-format the whole tree and **fail on any ESLint error** before the app runs. For fast iteration bypass the gate with `npx craco start`.
- **Production build:** `npm run build` → `build/` (this is what Flask serves).
- **Tests (Jest):** `npm test`. Run a single file without watch mode: `CI=true npx craco test src/backend/__test__/template.test.ts`. Filter by name: `npx craco test -t "prompt permutation"`.
- **Lint/format only:** `npm run clean` (prettier + eslint).

Python side (from repo root): `pip install -e .` then `chainforge serve` starts Flask on **port 8000**. Python deps are in `chainforge/requirements.txt`.

## Architecture: the app runs mostly in the browser

The single most important thing to understand: **`chainforge/react-server/src/backend/` is a full TypeScript reimplementation of ChainForge's core that executes client-side.** LLM querying (`backend.ts`, `query.ts`), prompt templating and permutation (`template.ts`), response caching (`cache.ts`), the model registry (`models.ts`), and shared types (`typing.ts`) all run in the browser. This is why `craco.config.js` polyfills a large set of Node built-ins (buffer, crypto, stream, http, net, …) — browser code calls APIs that assume Node.

The **Flask backend (`flask_app.py`) is deliberately thin.** In a packaged install it just serves `react-server/build/`. Its routes only cover work that genuinely needs a server: `/app/executepy` (run Python eval-node code in a subprocess), fetching example/OpenAI-eval flows, reading environment API keys, custom providers, flow storage (`/api/flows/*`), media upload, and a CORS image proxy. Python evaluation can alternatively run **fully in-browser via Pyodide** (`src/backend/pyodide/`).

**Frontend ↔ Flask wiring:** `FLASK_BASE_URL` (`src/backend/utils.ts:67`) is `"/"` when served by Flask (detected via injected `window.__CF_PORT`) and otherwise defaults to `http://localhost:8000/`. So during frontend dev you visit **localhost:3000**, but server-dependent features (Python eval, flow save/load, example flows, env API keys) require a Flask instance on **8000** running alongside. Pure in-browser features (LLM calls with keys entered in the UI, in-browser WebLLM models, templating) work with the dev server alone.

## The node graph

Each `src/*Node.tsx` is a ReactFlow node type. `BaseNode.tsx` is the shared shell (`NodeLabelComponent` for the title bar). Node types are registered in the `nodeTypes` map in `App.tsx` (~L189) — **adding a new node requires an entry there.** Central nodes: `PromptNode` (used for both `prompt` and `chat` types), the eval nodes (`CodeEvaluatorNode`, `SimpleEvalNode`, `LLMEvalNode`, `MultiEvalNode`), `TabularDataNode`, `VisNode`, `InspectorNode`.

Graph state lives in a **Zustand store (`store.tsx`)** — nodes, edges, and `initLLMProviderMenu` (the model list shown in the UI). Nodes pass data along edges: a node reads upstream inputs via `pullInputData`/`getLLMsInPulledInputData` and writes its outputs to **`node.data.fields`** (a flat array of `TemplateVarInfo`, each carrying text/prompt/vars/`llm`). Note `data.fields` is only an array on prompt/chat nodes — other nodes store an object there, so guard with `Array.isArray` before iterating across arbitrary nodes.

## Model registry is duplicated — keep both in sync

Adding or changing a model touches **two** places:

- `src/backend/models.ts` — the `NativeLLM` enum (canonical model id strings) plus per-model lookup tables keyed by those strings: `RATE_LIMIT_BY_MODEL`, `MAX_CONCURRENT`, `COST_PER_REQUEST_BY_MODEL`. `getProvider()` maps a model id to an `LLMProvider`.
- `store.tsx` — `initLLMProviderMenu`, the grouped `{ name, emoji, model, base_model, temp }` items that populate the "Add model" menu. `base_model` selects which settings form (`ModelSettingSchemas.tsx`) the model uses and must be unique per settings schema.

Per-model backend behavior (settings, request shaping) is defined in `ModelSettingSchemas.tsx` and the provider call functions in `backend/utils.ts`.

## Tests

TypeScript backend logic is covered under `src/backend/__test__/*.test.ts` (templating, caching, querying, provider-specific like `minimax.test.ts`). There are no tests for the React UI components. Provider tests that hit real APIs need the relevant keys in the environment.
