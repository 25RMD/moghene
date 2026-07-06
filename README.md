# Moghene Workspace

This repo is organized like the `silina` project:

- `frontend/` — public storefront
- `admin/` — separate admin frontend
- `backend/` — API for catalog and inventory management

## Install

```bash
npm install
```

## Run

```bash
npm run backend:dev
npm run frontend:dev
npm run admin:dev
```

The storefront runs at `http://localhost:5173`, the inventory app at
`http://localhost:5174`, and the API at `http://localhost:5000`.

## Surfaces

- `/` — editorial storefront homepage
- `/shop` — searchable, filterable storefront collection
- `/lookbook` — shoppable campaign story
- Admin login and API-backed inventory CRUD in the separate `admin/` app
- Persistent size-aware bag with quantity controls and WhatsApp checkout

## Production checks

```bash
npm run frontend:build
npm run admin:build
node --check backend/src/server.js
```

Copy each `.env.example` to `.env` and replace all placeholder credentials,
store contact details, URLs, and allowed origins before deployment.

The production backend is currently:

```bash
https://moghene-backend-production.up.railway.app
```

Frontend and admin builds should use:

```bash
VITE_API_URL=https://moghene-backend-production.up.railway.app/api/v1
```
