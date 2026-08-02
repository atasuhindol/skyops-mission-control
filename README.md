# SkyOps Mission Control

SkyOps Mission Control is a self-contained local MVP for managing a drone fleet, missions, and maintenance activities.

## What is included
- NestJS backend with TypeORM and SQLite persistence
- React/Vite frontend with dashboard, drone registry, mission management, and maintenance logs
- Database migrations and a seed script to populate realistic sample data
- Backend unit tests covering core validation logic

## Run locally

### 1. Install dependencies
```bash
cd backend
npm install
cd ../frontend
npm install
```

### 2. Create local database and seed data
```bash
cd ../backend
npm run seed
```

### 3. Start the backend
```bash
cd backend
npm run start:dev
```

### 4. Start the frontend
```bash
cd frontend
npm run dev
```

The frontend expects the backend at http://localhost:3000/api and will run on http://localhost:5173.

## Test
```bash
cd backend
npm test
```

## 🚀 Tech Stack
*   **Backend:** NestJS (TypeScript), TypeORM
*   **Database:** PostgreSQL
*   **Frontend:** React / Vite (TypeScript)
*   **Testing:** Jest (Backend), Playwright (Frontend E2E)

## 📦 Prerequisites
*   Node.js (v18+)
*   Docker & Docker Compose

## 🛠️ Quick Start

### 1. Start the Database
From the root directory, spin up the PostgreSQL instance:
```bash
docker-compose up -d

## Notes
- The SQLite database lives in `backend/data/skyops.sqlite`.
- The app is designed to run full-stack from this project folder without external services.
