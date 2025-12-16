# AceTerus Rebrand

Welcome to AceTerus' evolving learning platform. This repository now contains the legacy **OpenMultipleChoice** Laravel project inside the `openmultiplechoice/` folder so we can surface its decks, questions, and media inside the new Vite/React frontend.

## OpenMultipleChoice API setup

1. **Install & configure Laravel**
   - `cd openmultiplechoice`
   - Copy `.env.example` to `.env`, set `APP_URL`, `SANCTUM_STATEFUL_DOMAINS`, database credentials, and `SESSION_DOMAIN`.
   - Run `composer install`, `php artisan key:generate`, then run `php artisan migrate`.
   - Expose media with `php artisan storage:link`.

2. **Start the API**
   - `php artisan serve --host=127.0.0.1 --port=5432`
   - Keep this URL handy; we will point the frontend at it.

3. **Authentication options**
   - **Sanctum session cookie**: log into the Laravel app in the same origin (works best when AceTerus and OpenMC share a parent domain).
   - **Personal access token**: run `php artisan tinker` and call `User::first()->createToken('aceterus')->plainTextToken` to copy a bearer token; revoke it from the Laravel UI if leaked.

## Frontend environment variables

Add the following entries to your `apps/.env` or `.env.local` (Vite) file:

```
VITE_OPENMC_API_URL=http://127.0.0.1:5432
VITE_OPENMC_API_TOKEN=your_token_if_using_bearer_auth
```

- When using Sanctum cookies, leave `VITE_OPENMC_API_TOKEN` empty and ensure your browser can send credentials to the backend domain.
- When using bearer tokens, the new OpenMC client will automatically attach the header `Authorization: Bearer <token>`.

## Development workflow

1. Ensure the Laravel API is running and reachable at `VITE_OPENMC_API_URL` (now `http://127.0.0.1:5432` by default).
2. In the project root, install JS deps (`bun install` or `npm install`).
3. Start the frontend: `bun dev` (or `npm run dev`). It now serves on `http://localhost:5174/` to avoid clashing with the API port.
4. Visit `http://localhost:5174/quiz` to verify decks load from OpenMultipleChoice.