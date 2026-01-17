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

## Supabase Edge Function configuration

The React app no longer talks to OpenMultipleChoice directly. Instead, authenticated AceTerus users call the Supabase Edge Function `openmc-quizzes`, which proxies the Laravel API with a server-side bearer token. Configure the function secrets via `supabase secrets set` (or the Dashboard) before deploying:

```
OPENMC_BASE_URL=http://127.0.0.1:5432
OPENMC_API_TOKEN=your_personal_access_token
OPENMC_DEFAULT_DECK_ID=1             # optional fallback when no deckId is provided
```

- `OPENMC_BASE_URL` should match the Laravel host/port from the previous section.
- `OPENMC_API_TOKEN` is a Sanctum personal access token with permission to read decks/questions.
- `OPENMC_DEFAULT_DECK_ID` lets you define a public deck that loads automatically when the frontend does not pass an explicit ID.

To run the function locally: `supabase functions serve openmc-quizzes --env-file ./supabase/.env` (or export the vars in your shell). Deploy with `supabase functions deploy openmc-quizzes`.

## Frontend environment variables

The frontend only needs to know how to build media URLs for question images:

```
VITE_OPENMC_ASSET_BASE_URL=http://127.0.0.1:5432
```

- This should point at the same host that serves Laravel's `storage/` symlink so `<base>/storage/...` resolves correctly.
- All quiz data now flows through Supabase, so no API tokens are exposed in the browser.

## Development workflow

1. Ensure the Laravel API is running and reachable at `OPENMC_BASE_URL`.
2. Start the Supabase stack or functions emulator so `openmc-quizzes` can call the API.
3. In the project root, install JS deps (`bun install` or `npm install`) and run `bun dev`.
4. Visit `http://localhost:5174/quiz` while signed into AceTerus. The page now lists decks via the Edge Function and lets you run the entire quiz session inline.