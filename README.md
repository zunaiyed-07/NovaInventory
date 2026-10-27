# NovaInventory

**A bilingual point-of-sale and inventory platform for independent retailers.**

NovaInventory brings checkout, stock control, customer credit, shift reconciliation, barcode scanning, and monthly business reporting together in a responsive application designed for everyday shop operations.

> **Data storage:** The laptop runs a local JSON-file server, and devices connected to the same Wi-Fi share that data. Browser LocalStorage remains as an offline fallback. No cloud service is used.

## Features

- **Point of sale:** Product catalog, cart, discounts, VAT, cash/card/mobile financial service payments, credit sales, customer balances, receipts, and return-aware stock updates.
- **Barcode scanning:** Live camera scanning for barcodes and QR codes, manual barcode/SKU entry, and support for USB or Bluetooth scanners that type into the POS.
- **Inventory management:** Product catalog, bilingual product names, SKU and barcode records, cost and selling prices, stock alerts, expiry tracking, printable labels, and CSV import/export.
- **Customer credit (Baki Khata):** Customer balances, credit limits, repayment records, and WhatsApp reminders.
- **Shift register:** Opening and closing cash, petty expenses, drawer reconciliation, and printable reconciliation slips.
- **Expenses and monthly profit & loss:** Record operating expenses, review monthly sales revenue, cost of goods sold, gross profit, expenses and net profit/loss, and print a monthly statement.
- **Sales returns:** Look up invoices, process partial or full returns, and issue cash refunds or store-credit vouchers.
- **English and Bengali:** Switch between English and বাংলা throughout the application.
- **Light and dark themes:** Switch themes without losing the existing interface preferences.
- **Installable app:** Progressive Web App support for adding NovaInventory to a compatible device.
- **Local backup and portability:** Export or restore the application data in JSON format.

## Technology

- React 19 and TypeScript
- TanStack Start and TanStack Router
- Tailwind CSS and Radix UI components
- Zustand with LocalStorage persistence
- Local Express JSON-file API with LAN polling synchronization
- Recharts for financial visualizations
- `html5-qrcode` for camera-based barcode and QR scanning
- Vitest for tests

## Getting started

### Requirements

- Node.js 20.19 or later (or 22.12 or later)
- npm

### Install and run

```bash
git clone https://github.com/zunaiyed-07/NovaInventory.git
cd NovaInventory
npm install
npm run start:all
```

Open the local URL printed by Vite on the laptop. To use another device, connect it to the same Wi-Fi and open that URL using the laptop's local IP address (for example, `http://192.168.0.10:8080`). If Windows Firewall prompts, allow Node.js on private networks. Keep `npm run start:all` running while using shared devices.

### Enable camera scanning on the LAN

Browsers only allow camera access on secure origins. `http://localhost:8080` works on the laptop, but `http://<laptop-LAN-IP>:8080` does not. Install [mkcert](https://github.com/FiloSottile/mkcert) on the laptop, connect it to the same Wi-Fi as the other devices, then run:

```bash
npm run https:setup
npm run start:all
```

The setup command creates a local certificate for the laptop's current Wi-Fi IP and trusts its local certificate authority on the laptop. Securely transfer mkcert's `rootCA.pem` to each phone/tablet (the setup command prints its location) and install it as a trusted CA certificate in the device's security settings. On iPhone/iPad, also enable full trust under **Settings → General → About → Certificate Trust Settings**. Then open the `https://<laptop-LAN-IP>:8080` address shown by Vite. If the laptop changes networks or its LAN IP changes, rerun `npm run https:setup`. Certificate trust is required on every device; dismissing a certificate warning may not enable camera access.

The Express API runs on the laptop at `127.0.0.1:3001`; Vite proxies API requests from connected browsers. The API is not directly exposed on the Wi-Fi network. Shared application data is stored in the ignored `data/store.json` file on the laptop. Polling updates other devices automatically, while LocalStorage keeps the app usable if the server or Wi-Fi is temporarily unavailable.

## Available commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server. |
| `npm run server` | Start the local JSON API server. |
| `npm run start:all` | Start the API and LAN-accessible Vite server together. |
| `npm run build` | Create a production build. |
| `npm run build:dev` | Create a development-mode build. |
| `npm run preview` | Preview the production build locally. |
| `npm test` | Run the test suite once. |
| `npm run test:watch` | Run tests in watch mode. |
| `npm run lint` | Run ESLint. |

## Camera scanning

Camera access requires a **secure context**: use `localhost` on the laptop or follow the LAN HTTPS setup above. When the scanner opens, allow camera access in the browser. On mobile devices the scanner prefers the rear-facing camera.

If a camera is unavailable or permission is declined, enter a barcode or SKU manually. A USB or Bluetooth barcode reader can also be used at the POS; most scanners send the scanned value as keystrokes followed by Enter.

## Data, backups, and privacy

The laptop's local JSON file is the shared source of truth whenever it is reachable. Each browser also persists a copy in LocalStorage for offline use; edits made while disconnected are synchronized when the server becomes reachable again. Back up important records regularly using **Settings → Backup & portability → Export JSON database**. Use the JSON import option to restore a backup.

Camera access is only requested when the scanner is opened. Camera scanning is processed by the browser; the application does not upload scanned images to a NovaInventory server. Application assets and fonts are served locally without a cloud dependency.

## Project structure

```text
server/         Local Express API and JSON-file persistence
scripts/        LAN HTTPS certificate setup
public/         PWA manifest, service worker, icons, and static assets
data/           Runtime shared database (ignored by Git; created by the server)
src/
├── components/
│   ├── nova/     App shell, providers, POS scanner, receipts, and app UI
│   └── ui/       Reusable Radix-based UI components
├── hooks/        Reusable React hooks
├── lib/          Zustand store, sync, domain types, i18n, and utilities
├── locales/      English and Bengali translations
├── routes/       File-based TanStack Start pages
├── test/         Store, sync, routing, and component tests
├── router.tsx    TanStack Router and generated route-tree setup
├── start.ts      Server middleware and CSRF configuration
└── server.ts     SSR entry and server-side error handling
```

### Runtime architecture

The browser UI is rendered through TanStack Start and its file-based TanStack Router routes. `src/routes/__root.tsx` provides the app-wide shell, while `src/components/nova/Providers.tsx` waits for Zustand's LocalStorage rehydration before mounting the app shell and starting LAN synchronization.

`src/lib/store.ts` is the client-side domain store and offline copy. User actions update this store, which persists to browser LocalStorage. `src/lib/sync.ts` polls the local API, initialized from the browser copy when no server data exists. It sends changed state with a revision; the server rejects stale writes with a conflict response, and the client merges changes before retrying. When the API or network is unavailable, the UI remains usable with the browser copy and reports the offline sync status.

`server/index.js` is the laptop-local Express API. It listens only on `127.0.0.1:3001`, validates the top-level state shape, serializes writes, and atomically saves the current state to the ignored `data/store.json` file. During LAN use, Vite serves the browser app and proxies `/api` requests to this API; the API itself is not bound to the Wi-Fi interface. This is a local shop deployment, not a hosted or multi-tenant backend.

`src/start.ts` configures TanStack Start server middleware, including CSRF protection for server functions. `src/server.ts` wraps the generated SSR server entry with error handling. `src/routeTree.gen.ts` is generated by TanStack Router and should not be edited manually.

## Contributing

1. Create a focused branch for your change.
2. Keep user-facing text in both `src/locales/en.ts` and `src/locales/bn.ts`.
3. Run the relevant tests and a production build before opening a pull request.
4. Include a concise description of the behavior changed and any validation performed.

## License

No license is currently specified. Contact the repository owner regarding usage and redistribution.
