# Task Floometer

Mini-app TypeScript di project management volutamente incompleta. È il laboratorio del Capitolo 5 di *Agentic Coding per Sviluppatori - Il Manuale Avanzato di Cursor*.

Tre quest da risolvere usando Cursor: un middleware di autenticazione rotto, un'integrazione GitHub via skill custom e MCP, una test suite scritta dal Cloud Agent partendo da tre errori HTTP (403, 500, 409).

## Stack

- Node 20+ con TypeScript ESM
- Express 4 + better-sqlite3
- Autenticazione JWT con cookie httpOnly per la dashboard
- Dashboard server-rendered con template literal (niente build frontend)
- Vitest + Supertest per i test
- Schema kebab-case, validazione con Zod, zero magia

## Avvio rapido

```bash
# hai gia lo ZIP dalla community Telegram: scompattalo ed entra nella cartella
cd task-floometer
cp .env.example .env
npm install
npm run db:seed
npm run dev
```

L'app risponde su `http://localhost:3000`. Login demo: `ada@floometer.dev` / `floometer`.

Il codice del lab si scarica come archivio ZIP dalla community Telegram: https://t.me/+cLTPwWMrBBc4YmJk

Per ripartire da capo: `npm run db:reset && npm run db:seed`.

Test: `npm test` (alcuni sono `skip` di proposito perche descrivono lo stato atteso dopo le quest).

## Account demo

| Email                  | Ruolo  | Note                                         |
|------------------------|--------|----------------------------------------------|
| ada@floometer.dev      | admin  | accesso a tutti i progetti                   |
| linus@floometer.dev    | member | contributor sui progetti a cui appartiene    |
| grace@floometer.dev    | member | contributor / contributore lato design       |
| rms@floometer.dev      | viewer | nessun progetto, ottimo cavia per i 403      |

Password per tutti: `floometer`.

## Mappa del codice

```
src/
  server.ts            bootstrap Express, error handler, montaggio router
  config.ts            lettura .env
  db/
    schema.ts          DDL SQLite
    index.ts           connessione + tipi riga
  middleware/
    auth.ts            authenticate, requireAuth, requireRole (rotto: Quest 1)
  lib/
    layout.ts          template literal con escaping
    access.ts          regole di lettura/scrittura per progetto
    http-error.ts      classe errore tipata
  routes/
    auth.ts            /login, /logout, POST /api/login
    me.ts              GET /api/me
    projects.ts        CRUD progetti
    tasks.ts           CRUD task + /assign (Quest 3: 403/409)
    reports.ts         GET /api/reports/burndown/:slug (Quest 3: 500)
    integrations.ts    POST /api/projects/:slug/import (Quest 2)
    dashboard.ts       pagine SSR /dashboard e /projects/:slug
scripts/
  seed.ts              utenti, progetti e task realistici
  reset-db.ts          rimuove il file SQLite
tests/
  helpers.ts           seed di test, auth header signer
  smoke.test.ts        bootstrap + redirect
  quest-1-auth.test.ts spec del middleware (skipped finche non risolvi Quest 1)
  quest-3-errors.test.ts skeleton per i casi 403, 500, 409
```

## Le tre quest

### Quest 1 - Plan & Debug: aggiustare l'auth

Stato: il middleware `src/middleware/auth.ts` ha tre bug di sicurezza. I sintomi sono raccolti nel commento sopra `authenticate`. La spec corretta vive in `tests/quest-1-auth.test.ts` (al momento `describe.skip`).

Cosa fare:

1. **Plan Mode**: leggere `src/middleware/auth.ts`, `src/routes/auth.ts` e i test. Far dire al modello dove sono i bug e perche, senza ancora scrivere codice.
2. **Debug Mode**: rimuovere il `.skip` dal blocco Quest 1, lanciare `npm test`, osservare i fallimenti reali.
3. **Agent Mode**: applicare le correzioni minime sufficienti a far passare i test senza rompere `npm run dev` (login form + dashboard devono ancora funzionare).
4. Verificare a mano: token con segreto sbagliato, header senza "Bearer", token scaduto, header mancante.

Risorse Cursor: capitoli 1-2 del manuale per `Plan Mode` e `Debug Mode`, capitolo 3 per la disciplina della PR factory.

### Quest 2 - Skills & MCP: portare le issue GitHub in Task Floometer

Stato: c'e' un endpoint `POST /api/projects/:slug/import` che accetta una lista normalizzata di issue GitHub. Manca il "ponte" che le va a leggere dal repo reale.

Cosa fare:

1. Installare l'MCP GitHub ufficiale dentro Cursor (capitolo 4 del manuale).
2. Scrivere una skill custom in `.cursor/skills/import-github-issues/SKILL.md` che:
   - prende come input `<owner>` e `<repo>` e uno `slug` di progetto Task Floometer;
   - usa l'MCP GitHub per leggere le issue aperte del repo;
   - le normalizza nel payload `{ source: "github", items: [...] }`;
   - chiama `POST /api/projects/:slug/import` con il bearer dell'utente loggato.
3. Provarla su un repo pubblico (anche il proprio) e verificare che `npm run dev` mostri i task importati nella dashboard.

Il payload accettato dall'endpoint e' tipato con Zod in `src/routes/integrations.ts`. Ogni item richiede almeno `external_ref` (es. `gh:owner/repo#123`), `title`, opzionali `body`, `priority`, `labels`. Una `external_ref` gia importata viene saltata (no 409, ma `items_skipped` nel report).

### Quest 3 - Agent-First: test suite + tre errori

Stato: `tests/quest-3-errors.test.ts` parte con qualche caso scritto e un blocco `describe.skip` per il bug 500.

Cosa fare:

1. **Cloud Agent**: aprire un Cloud Agent dal manuale, dargli come prompt: "leggi il repo, in particolare `src/routes/tasks.ts` e `src/routes/reports.ts`, scrivi una test suite Vitest+Supertest completa che copre tutti i casi 403, 409 e il caso 500 segnalato in `tests/quest-3-errors.test.ts`. Fai aprire una PR sul branch `quest-3/tests`".
2. **Agent-First in locale**: aprire l'Agents Window e parallelizzare su tre task: (a) corretto burndown a 0 task, (b) corretto burndown con solo task archived, (c) review del diff del Cloud Agent in PR.
3. Far girare `npm test` e ottenere verde su tutta la suite, incluso `quest-1-auth.test.ts` (ereditato dalla Quest 1).
4. Documentare nel proprio repository la lezione in un file `LESSONS.md`: cosa il Cloud Agent ha fatto bene, cosa hai dovuto rifare a mano, dove e' stato il bottleneck di token.

### Definition of Done del laboratorio

- `npm run typecheck` verde.
- `npm test` verde su tutti i file (incluso `quest-1-auth.test.ts` con `.skip` rimosso).
- `npm run dev` funziona: login con `ada@floometer.dev`, navigazione dei progetti, creazione di un task.
- Una skill custom GitHub che importa almeno una issue reale.
- Una PR aperta dal Cloud Agent con i test della Quest 3, mergeable.
- Un `LESSONS.md` nel proprio repository con "Lezioni dal lab" (3-5 punti).

## Licenza

MIT. Sentiti libero di smontare e rimontare. Se trovi un bug non intenzionale, segnalalo nella community Telegram.
