# Finanzas App

App de finanzas personales que parsea extractos bancarios de Bancolombia, categoriza transacciones automáticamente y visualiza en qué estás gastando.

## Features

- **Upload de extractos PDF** de Bancolombia (con soporte de contraseña)
- **Categorización automática** de transacciones por keywords
- **Detección de suscripciones** (Netflix, Spotify, SmartFit, etc.)
- **Dashboard** con gráficos de gastos por categoría y mes
- **Historial de transacciones** con filtros y búsqueda

## Tech Stack

- **Frontend:** Next.js 15, React 19, Tailwind CSS, Recharts
- **Backend:** Node.js, Express, TypeScript (ESM)
- **Database:** SQLite (better-sqlite3)
- **PDF Parsing:** unpdf (pdfjs-dist)
- **Monorepo:** npm workspaces

## Setup

```bash
# Install dependencies
npm install

# Run the API (port 3001)
npm run dev:api

# Run the frontend (port 3000)
npm run dev:web
```

## Usage

1. Descarga tu extracto de Bancolombia (PDF) desde la Sucursal Virtual
2. En la app, click "Subir Extracto"
3. Selecciona el PDF e ingresa la contraseña (tu cédula)
4. Las transacciones se parsean y categorizan automáticamente

## Project Structure

```
├── apps/
│   ├── api/          # Express backend + PDF parser
│   └── web/          # Next.js frontend
├── packages/
│   └── shared/       # Types, category rules, constants
└── package.json      # Workspace root
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/upload | Upload and parse a bank statement PDF |
| GET | /api/transactions | List transactions (supports filters) |
| PATCH | /api/transactions/:id | Update transaction category |
| GET | /api/summary/monthly | Monthly income vs expenses |
| GET | /api/summary/categories | Spending breakdown by category |
| GET | /api/summary/top-merchants | Top spending merchants |
| GET | /api/subscriptions | Detected subscriptions |
