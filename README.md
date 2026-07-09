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

## Neon database

For production, add the Neon connection variables to the Railway backend
service. Prefer `DATABASE_URL` if Neon gives you one:

```bash
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
```

The backend also supports separate Neon variables:

```bash
PGHOST=your-neon-host
PGDATABASE=neondb
PGUSER=neondb_owner
PGPASSWORD=your-neon-password
PGSSLMODE=require
PGCHANNELBINDING=require
```

When these variables are present, products, categories, lookbook, and school
content are stored in Neon. Without them, local development falls back to the
JSON files in `backend/data/`.

## Cloudinary uploads

The admin item editor can upload product images through the backend to
Cloudinary. Add these variables to the Railway backend service:

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
UPLOAD_MAX_WIDTH=1800
UPLOAD_MAX_HEIGHT=2200
UPLOAD_WEBP_QUALITY=82
```

Uploads are available from the admin product editor. Manual image URLs still
work as a fallback. Uploaded files are auto-rotated, resized to fit within
`1800x2200`, compressed to WebP, and then sent to Cloudinary.
