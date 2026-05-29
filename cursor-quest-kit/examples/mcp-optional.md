# Optional MCP Upgrade Examples

Questi esempi sono facoltativi. Il kit funziona anche senza MCP.

## Esempio 1 — GitHub Issues -> Backlog locale

Obiettivo: trasformare issue aperte in task interni al progetto.

- Con MCP GitHub disponibile: leggi issue per label e priorita, poi genera un file backlog markdown.
- Senza MCP: usa un file input locale (`issues-sample.json`) con la stessa struttura e applica lo stesso flusso.

Output atteso:

- `docs/backlog-import.md` con elenco normalizzato.
- riepilogo "importate vs scartate".

## Esempio 2 — QA report da tool esterni

Obiettivo: creare una checklist di regressione a partire da segnalazioni esterne.

- Con MCP disponibile: estrai ticket aperti e clusterizza per area.
- Senza MCP: usa issue/ticket esportati in CSV locale.

Output atteso:

- `docs/qa-regression-checklist.md` con priorita e owner consigliati.
