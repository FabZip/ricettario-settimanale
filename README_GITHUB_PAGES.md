# Pubblicazione su GitHub Pages

Carica nel repository **tutti i file e tutte le cartelle** presenti in questo pacchetto.

## Attivazione

1. Apri il repository su GitHub.
2. Vai in **Settings → Pages**.
3. In **Build and deployment**, scegli **Deploy from a branch**.
4. Seleziona `main` e `/ (root)`.
5. Salva.
6. Apri l'indirizzo pubblicato da GitHub Pages.
7. Da Chrome Android scegli **Installa app** o **Aggiungi a schermata Home**.

## Correggere una ricetta dal telefono

Modifica su GitHub:

`database/recipes.json`

Dopo il salvataggio modifica anche:

`database/version.json`

Aumenta sempre il numero `version`, per esempio da 1 a 2, e aggiorna `updated_at`.

Puoi descrivere le modifiche in:

`database/changelog.json`

La PWA controlla automaticamente gli aggiornamenti all'apertura. Puoi anche premere
**Controlla aggiornamenti**.

## File da aggiornare in futuro

- `database/recipes.json`: ricette corrette.
- `database/version.json`: numero versione e data.
- `database/changelog.json`: riepilogo facoltativo.

Non serve ripubblicare o modificare gli altri file quando correggi soltanto le ricette.

## Sicurezza

Prima di sostituire il database locale, l'app controlla la struttura del JSON.
Se il file remoto è danneggiato, mantiene l'ultima versione valida salvata sul telefono.
