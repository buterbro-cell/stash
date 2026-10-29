# Stash — tokenized NFTs on NEAR

Stash is a no-code platform for launching **tokenized NFT collections** on NEAR: every NFT can hold NEAR or any NEP-141 token inside, which the owner can withdraw at any time. An NFT is never worth less than what it holds.

> **Status:** interactive prototype (demo). The blockchain is not connected yet: the wallet, balances and minting are simulated, and network prices are estimates.

## Features

- **Part generator** — generate backgrounds, bodies, eyes, mouths and headwear in one palette, lock the variants you like, regenerate the rest, and send the set to the builder.
- **Collection builder** — from layers (with rarity, manual edits of any NFT and 1-of-1 legendaries), from your own finished images, or algorithmic styles. Any size from 1 to 10,000; the builder suggests how many variants each layer needs.
- **Animation** — per-layer motion (float, sway, pulse, spin, blink, shimmer).
- **Tokens inside NFTs** — part of the mint price and/or your own token goes into every NFT. Withdrawals are locked while an NFT is listed for sale, so buyers get exactly what they see.
- **Release options** — sell on Stash (buyers pay the minting deposit) or mint the whole collection to your wallet and take it to any NEAR marketplace (NEP-171).
- **English / Russian** interface (English by default).

## Run it

It is a single static page with no build step. Open `index.html` in a browser, or serve the folder with any static server:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Demo data is stored in the browser's `localStorage`.

### Deploy

- **Buildpack hosts** (Northflank buildpack, Heroku-style): `npm start` serves the site on `$PORT` (default 8080).
- **Docker** (Northflank Dockerfile build, Fly.io, etc.): the `Dockerfile` serves it with nginx on port **8080**.
- **GitHub Pages / Vercel / Netlify**: no build step, publish the repository root.

## Roadmap

1. NEAR smart contracts: a collection factory and a NEP-171 NFT contract with per-token token balances (NEP-141), withdraw lock while listed, immutable code.
2. Wallet connection (NEAR testnet), real minting and NFT media upload to IPFS / Arweave with animated files.
3. Text-to-image part generation via an image model.
4. Independent audit before mainnet.

---

## По-русски

**Stash** — площадка без кода для запуска **токенизированных NFT-коллекций** на NEAR: внутри каждой NFT могут лежать NEAR или любой токен NEP-141, и владелец может забрать их в любой момент.

Сейчас это интерактивный прототип: блокчейн не подключён, кошелёк и балансы условные. Сайт — один файл `index.html`, его можно просто открыть в браузере. Язык переключается кнопкой EN / RU в шапке.
