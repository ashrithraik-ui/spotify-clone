# Frontend (Music Studio)

This frontend is now a React + Vite application that talks to the backend API in this repo.

## Development

1. Start the backend server (e.g. `node server.js`).
2. Open a new terminal, then run:

```sh
cd fullstack/frontend
npm install
npm run dev
```

3. Open the URL shown in the terminal (usually `http://localhost:5173`).

> The dev server proxies `/api/*` requests to `http://localhost:3000`.
> To override, set `VITE_API_ROOT` (e.g. `VITE_API_ROOT=http://localhost:4000/api`).

## Authentication

The backend requires authentication (JWT) to upload files and create albums. This frontend stores the token in `localStorage.auth_token` and sends it as `Authorization: Bearer <token>`.

To set a token manually for testing:

```js
localStorage.setItem('auth_token', 'YOUR_TOKEN_HERE')
```

Then refresh the page.
