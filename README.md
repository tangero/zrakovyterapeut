# Zrakovýterapeut.cz — rozcestník zrakové terapie v Česku

Nezávislý informační web o zrakové terapii: co léčí, jak probíhá vyšetření,
evidence-based postupy, domácí péče a přehled pracovišť v ČR.

## Technika

- Statický web (žádný framework, maximální rychlost) + mini-SSG v `src/build.mjs`
- Hosting: Cloudflare Workers Static Assets, konfigurace ve `wrangler.jsonc`
- Minimální Worker (`src/index.js`): kanonizace URL, bezpečnostní hlavičky, 404
- SEO: sémantické HTML, JSON-LD (WebSite, WebPage, MedicalCondition),
  sitemap.xml, robots.txt, české meta popisky

## Příkazy

```sh
npm run build    # vygeneruje public/
npm run dev      # build + lokální wrangler dev
npm run deploy   # build + nasazení na Cloudflare
npm run check    # kontrola syntaxe
```

## Přidání stránky

1. Vytvoř soubor `src/pages/<slug>.html` (hlavička `Title/Description/Slug`, pak HTML).
2. Přidej odkaz do navigace (`src/layout.html`) a na relevantní stránky.
3. Spusť `npm run build`.

## Struktura stránek

`/` (rozcestník) · `/co-je-zrakova-terapie` · `/diagnozy` + 5 diagnóz
(tupozrakost, šilhání, konvergenční insuficience, poruchy akomodace, dvojité
vidění) · `/vysetreni-a-terapie` · `/cviceni-a-domaci-pece` · `/pracoviste` ·
`/slovnicek` · `/caste-dotazy` · `/kontakt` · `/clanky` + 4 články
(okluzor, únava u PC, prevence myopie, první oční vyšetření)

## Produkce

- Dočasná URL: https://zrakovyterapeut.zandl.workers.dev
- Finální doména: zrakovyterapeut.cz (vyžaduje přesun DNS na Cloudflare,
  viz níže)

### Připojení vlastní domény (hotovo)

Doména je připojená přes klasické Workers Routes v `wrangler.jsonc`
(`zrakovyterapeut.cz/*` + `www…`, `www` redirectuje 301 na apex ve Workeru).
Pozn.: Custom Domains nešly použít, protože zóna už obsahovala externě
spravované A záznamy (chyba 100117) a OAuth token nemá DNS oprávnění.

Ověření: `curl -sI https://zrakovyterapeut.cz/ | head -3`
