# Complete Backend + Frontend

This repository contains a Node.js + Express backend and a React + Vite frontend for a music upload and playlist app.

## Quick start

1. Copy `.env.example` to `.env` and fill in your values.
2. Install backend dependencies:

```sh
npm install
```

3. Install frontend dependencies:

```sh
cd fullstack/frontend
npm install
```

4. Start the backend server:

```sh
npm run dev
```

5. Start the frontend in another terminal:

```sh
cd fullstack/frontend
npm run dev
```

## Available scripts

- `npm start` / `npm run dev` — runs the backend server
- `npm run build:frontend` — installs frontend dependencies and builds the React app

## Environment variables

Use `.env` to configure:

- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — JSON Web Token secret
- `IMAGEKIT_PRIVATE_KEY` — private key for file uploads
- `PORT` — server port
- `NODE_ENV` — environment mode

## Improvements added

- Centralized Express error handling
- `/api/health` health-check endpoint
- `/api/auth/me` current user endpoint
- Better JWT auth middleware for both `user` and `artist` roles
- Playlist access now supports any authenticated account
- Resource validation for album and music IDs
- Schema timestamps for users, music, and albums
- Root documentation and `.gitignore`
