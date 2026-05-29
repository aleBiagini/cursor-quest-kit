---
name: project-quest-runner
description: Generate a 3-quest practical lab tailored to the current repository (fix, integration, test-hardening), with explicit constraints and acceptance checks. Use when the user asks to start a hands-on Cursor exercise on their own project.
disable-model-invocation: true
---

# Project Quest Runner

## Mission

Trasforma il repository aperto in un mini laboratorio pratico con 3 quest progressive, specifiche per il codice reale del progetto.

Le quest devono essere eseguibili con Cursor senza dipendenze esterne obbligatorie. Le integrazioni MCP sono solo un upgrade opzionale.

## Input richiesto

Prima di generare le quest, conferma:

1. Obiettivo principale dell'utente (stabilizzazione, feature, quality, onboarding, altro).
2. Durata target dell'esercizio (es. 45, 60, 90 minuti).
3. Livello desiderato (base, intermedio, avanzato).

Se mancano input, usa default:

- obiettivo: quality + affidabilita
- durata: 60 minuti
- livello: intermedio

## Discovery obbligatoria (rapida)

1. Mappa stack, entrypoint e superfici test.
2. Identifica 3 aree ad alto valore e basso rischio di regressione critica.
3. Rileva i comandi di verifica realistici (`test`, `typecheck`, `lint`, smoke run).

Non inventare file o comandi: usa solo elementi presenti nel repository.

## Contratto di output

Produci **esattamente 3 quest**, in difficolta crescente:

- Quest 1 (Small): fix o hardening localizzato, impatto minimo.
- Quest 2 (Medium): miglioramento integrazione/automazione senza dipendenza MCP obbligatoria.
- Quest 3 (Advanced): test-hardening o quality gate su una superficie multi-file.

Per ogni quest includi:

1. **Objective**: risultato concreto.
2. **Scope**: file/superfici da toccare e cosa non toccare.
3. **Acceptance checks**: test o comandi osservabili.
4. **Suggested Cursor mode**: Plan, Agent o Debug, con motivo breve.
5. **Execution prompt**: prompt copy/paste pronto da usare in chat.

Ogni quest deve essere chiudibile in 15-30 minuti.

## Regole di sicurezza didattica

- Preferisci modifiche chirurgiche e reversibili.
- Evita refactor ampi se non richiesti.
- Non proporre migrazioni distruttive.
- Non introdurre dipendenze nuove salvo richiesta esplicita.
- Se il repo non ha test, converti acceptance in smoke checks realistici.

## MCP opzionale (mai obbligatorio)

Dopo le 3 quest base, puoi aggiungere una sezione facoltativa:

`Optional MCP Upgrade`

Includila solo se ci sono segnali credibili che tool MCP siano disponibili/utili.
La sezione deve:

1. restare separata dalle quest core,
2. offrire fallback no-MCP,
3. esplicitare output atteso (es. sync issue, report, triage).

## Formato risposta richiesto

Usa questo template:

```markdown
# Tailored Quest Pack

## Context Snapshot
- Stack:
- Verification commands:
- High-value surfaces:

## Quest 1 — <title>
- Objective:
- Scope:
- Acceptance checks:
- Suggested mode:
- Execution prompt:

## Quest 2 — <title>
- Objective:
- Scope:
- Acceptance checks:
- Suggested mode:
- Execution prompt:

## Quest 3 — <title>
- Objective:
- Scope:
- Acceptance checks:
- Suggested mode:
- Execution prompt:

## Debrief Checklist
- [ ] Ho eseguito i check richiesti
- [ ] Ho verificato i vincoli di scope
- [ ] Ho annotato cosa migliorare nel prossimo giro
```

## Quality bar finale

Prima di consegnare le quest, verifica:

1. Sono specifiche per questo repo (non generiche).
2. I check sono eseguibili con comandi reali.
3. Non richiedono MCP per funzionare.
4. La progressione Small -> Medium -> Advanced e coerente.
