# Pískování Bruzovice

Svelte 5, Bootstrap 5, Vite a Google Fonts. Responzivní web s galerií, čtyřmi videi a poptávkovým formulářem. Animace respektují omezení pohybu; automatické video v úvodu se načítá jen na desktopu.

## Vercel – nasazení

Projekt importujte do Vercelu. Soubor `vercel.json` nastavuje build `npm run build:vercel` a výstup `dist/client`. Funkce `api/inquiries.js` běží na serveru a odesílá poptávky přes Resend.

V **Project → Settings → Environment Variables** importujte hodnoty z místního `.env.local` pro Production (případně i Preview), uložte a spusťte **Redeploy**. `.env.local` se záměrně neposílá do Git ani do nasazení, takže jeho místní existence nenastaví cloudové prostředí automaticky.

| Proměnná | Hodnota |
| --- | --- |
| `RESEND_API_KEY` | Skutečný klíč je v místním `.env.local`; nikdy jej nevkládejte do zdrojového kódu ani do proměnné s prefixem `VITE_`. |
| `INQUIRY_TO` | `gadula.jiri@seznam.cz` |
| `INQUIRY_FROM` | `Jiří Gadula – Pískování Bruzovice <web@piskovanibruzovice.cz>` |

Doména `piskovanibruzovice.cz` byla při úpravě ověřena v účtu Resend. Pro odesílání musí zůstat ověřené její DNS záznamy. Z adresy `gadula.jiri@seznam.cz` nelze přes Resend posílat bez ověření domény seznam.cz. Viditelný název odesílatele je Jiří Gadula – Pískování Bruzovice; skutečná adresa je `web@piskovanibruzovice.cz`. **Reply-To** obsahuje adresu zákazníka, takže Odpovědět v poště míří přímo jemu.

Formulář kontroluje vstupy, souhlas, původ požadavku, velikost zprávy a skryté pole proti botům. Opakování stejného požadavku používá Resend Idempotency-Key. Úspěch zobrazí až po přijetí zprávy službou Resend; doručení do schránky závisí na příjemcově poštovním serveru. Při chybě zachová údaje a nabídne přímý e-mail. Fotografie se přikládají v e-mailovém klientu.

## Místní spuštění

Node.js 22.9 nebo novější:

```sh
npm install
npm run api:dev
# V druhém terminálu:
npm run dev
```

API používá `.env.local` a stejný handler jako Vercel. Formulář v tomto režimu skutečně odesílá e-maily. Bez klíče vrátí srozumitelnou chybu. Pro vlastní konfiguraci zkopírujte `.env.example` do `.env.local` a doplňte klíč.

```sh
npm run build:vercel
npm test
```

Testy používají náhradu služby Resend a žádné skutečné e-maily neposílají.

## Starší varianta Sites / Cloudflare

Soubory `worker/`, `db/`, `drizzle/` a `wrangler.json` patří původní databázové variantě. `npm run build` sestaví tuto variantu; `npm run api:sites` spustí její místní API. Nasazení na Vercel používá výhradně `build:vercel` a `api/inquiries.js`. Cloudflare Worker poptávky ukládá do D1 a neodesílá je přes Resend.
