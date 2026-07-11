# Configurazione GitHub Pages da smartphone

## Prima configurazione

La prima volta devi caricare nel repository:

1. `app.zip`
2. il file workflow nel percorso `.github/workflows/deploy.yml`

Nel pacchetto trovi anche una copia chiamata `deploy.yml`, utile per aprire e copiare
facilmente il contenuto dal telefono.

## Creare il workflow dal browser del telefono

1. Apri il repository su GitHub.
2. Tocca **Add file → Create new file**.
3. Come nome del file scrivi esattamente:

   `.github/workflows/deploy.yml`

4. Copia dentro il contenuto del file `deploy.yml`.
5. Salva con **Commit changes**.
6. Torna al repository e carica `app.zip`.

## Attivare GitHub Pages

1. Vai in **Settings → Pages**.
2. In **Build and deployment**, scegli **GitHub Actions**.
3. Apri la scheda **Actions**.
4. Attendi il completamento del workflow **Pubblica PWA da ZIP**.

## Aggiornamenti successivi

Dopo la prima configurazione dovrai sostituire soltanto:

`app.zip`

Ogni commit che modifica `app.zip` avvierà automaticamente la pubblicazione.

## Perché servono due file la prima volta

GitHub non può estrarre ed eseguire automaticamente un unico ZIP in un repository
vuoto: il workflow deve già esistere nel repository. Dopo averlo creato una volta,
gli aggiornamenti richiedono davvero un solo file.
