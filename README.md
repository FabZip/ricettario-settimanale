# Ricettario antireflusso — PWA

PWA offline generata da 167 ricette disponibili.

## Funzioni

- scelta tra ricettario adattato e originale;
- menu settimanale con pranzo e cena;
- rigenerazione completa o sostituzione di un singolo pasto;
- lista della spesa automatica;
- adattamento delle quantità per 1–4 persone;
- ricerca per uno o più ingredienti;
- filtri per pasto e categoria;
- preferiti;
- condivisione della lista della spesa;
- funzionamento offline dopo la prima apertura.

## Avvio sul computer

La PWA deve essere servita tramite HTTP; non aprire direttamente `index.html`.

Con Python:

```bash
cd pwa_ricettario_antireflusso
python3 -m http.server 8080
```

Poi apri:

```text
http://localhost:8080
```

## Installazione su Android

Per installarla realmente sul telefono, pubblica la cartella su un servizio HTTPS
come GitHub Pages, Netlify, Cloudflare Pages o un tuo server.

Apri l’indirizzo con Chrome, quindi:

1. menu ⋮;
2. **Aggiungi a schermata Home** oppure **Installa app**;
3. conferma.

Dopo la prima apertura completa, ricette e funzioni principali restano disponibili offline.

## Pubblicazione rapida con Netlify

Puoi trascinare l’intera cartella nel pannello “Deploy manually” di Netlify.
Riceverai un indirizzo HTTPS installabile come PWA.

## Sicurezza

La versione originale può includere ingredienti non compatibili con le indicazioni
del gastroenterologo. La versione adattata resta quella consigliata per l’uso quotidiano.
