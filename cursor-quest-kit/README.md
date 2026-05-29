# Cursor Quest Kit

Kit portabile per trasformare qualsiasi repository in un laboratorio pratico a quest, eseguibile direttamente in Cursor.

## Struttura

- `.cursor/skills/project-quest-runner/SKILL.md`: skill riutilizzabile che genera quest su misura in base al progetto aperto.
- `START_HERE.md`: prompt unico da copiare in chat per avviare il laboratorio.
- `QUEST_STATE.md`: stato progressivo delle quest (checkpoint, esiti, lezioni apprese).
- `examples/mcp-optional.md`: esempi opzionali con MCP (non richiesti per il flusso base).

## Come usarlo

1. Copia la cartella `cursor-quest-kit/` nella root del progetto su cui vuoi allenarti.
2. Apri quel progetto in Cursor.
3. Copia e incolla il prompt in `START_HERE.md`.
4. Esegui le quest una alla volta e aggiorna `QUEST_STATE.md` dopo ogni chiusura.

## Obiettivo didattico

Allenare il ritmo operativo reale:

- analisi (Plan/Ask),
- patch mirate (Agent),
- verifica con test/check,
- retrospettiva sintetica.
