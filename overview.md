# Sigil Project Overview

Stand: 29. September 2026  
Produktions-URL: [sigil.s3ntrylabs.com](https://sigil.s3ntrylabs.com)  
Chrome Web Store: [Sigil - Web3 Trust Layer](https://chromewebstore.google.com/detail/sigil-web3-trust-layer/klogkofhnlifhakklkjmoofhfopnhnkg)

> Statushinweis: Dieses Dokument beschreibt den nachpruefbaren Stand des aktuellen Repository-Worktrees. Der EU/DE-Release-Audit steht derzeit auf `NO_GO`, bis die bestaetigte Extension-Trust-Boundary-Schwachstelle behoben und die offenen organisatorischen Compliance-Nachweise bestaetigt sind. Roadmap-Haken allein gelten hier nicht als Funktionsnachweis.

## 1. README / Projektbeschreibung

**Sigil** ist die Web3-Sicherheitsplattform von S3ntryLabs. Das Produkt soll Nutzern helfen, Wallet-, Vertrags- und Transaktionsrisiken zu verstehen, bevor sie eine Signatur oder Transaktion bestaetigen.

Kernpositionierung:

> Understand wallet and transaction risk before you sign.

Sigil besteht aus drei zusammenhaengenden Produktflaechen:

1. **Web-App:** Analysekonsole fuer Transaktionen, Smart Contracts, Signaturdaten, Freigaben, Wallet-Exposition und oeffentliche Bedrohungsinformationen.
2. **Chrome Extension:** Lokale Vorpruefung und kontextbezogene Warnungen bei EIP-1193-Wallet-Anfragen sowie Copy/Paste-, Website- und Session-Werkzeuge.
3. **API/Backend:** Normalisierung von On-Chain-Daten, deterministische Risikoerkennung, AI-gestuetzte Erklaerungen, Freigabeanalyse und Speicherung freigegebener Analyseergebnisse.

Sigil ist kein Wallet, verwahrt keine Seed Phrases oder Private Keys und soll keine Transaktion selbst autorisieren. Es ist ein beratendes Sicherheitsprodukt und ersetzt weder Wallet-Bestaetigungen noch professionelle Sicherheits-, Rechts- oder Finanzberatung.

## 2. Aktueller Feature-Stand

### Web-App

| Bereich | Stand | Aktuelle Funktion |
| --- | --- | --- |
| Scanner | Implementiert | Analysiert EVM-Transaktions-Hashes und Contract-Adressen mit Streaming-Ausgabe, Risikoscore, Verdict, Warnungen und positiven Signalen. |
| Transaction Simulation | Implementiert | Prueft rohe Calldata- oder JSON-Transaktionsdaten vor dem Signieren. |
| Contract Risk | Implementiert | Verifikations-, Bytecode-, Proxy-, bekannte Entitaeten- und Reputationssignale. |
| Approval Inspector | Implementiert | Erkennt Approval-Operationen, Spender, unbegrenzte Freigaben und bekannte Gegenparteien. |
| Approval Health Check | Implementiert | Scannt eine manuell eingegebene oeffentliche Wallet-Adresse und priorisiert aktive, riskante oder unbegrenzte Approvals. |
| Wallet Monitor v1 | Implementiert | Lokale Watchlist, Approval-basierter Hygiene-Score und priorisierte "Fix this first"-Liste. |
| Address Watchlist | Implementiert | Wallets, Vaults, Multisigs und Contracts lokal speichern, aktualisieren sowie als JSON importieren/exportieren. |
| Site Reputation | Implementiert | Schneller lokaler Heuristik-Check fuer bekannte Domains, verdachtige Clone-Muster und unbekannte Sites. |
| History / Intel Feed | Implementiert | Zeigt gespeicherte Analysen und kuratierte Hall-of-Shame-Faelle. |
| Contract Diff | Implementiert | Vergleicht EIP-1967-Proxy-Implementierungen und hebt Aenderungsrisiken hervor. |
| Onboarding | Implementiert | Kurzer Lernpfad zu Approvals, Signaturen, Verdicts, Extension und Wallet Monitor. |
| Rechtliche Seiten | Implementiert, Review offen | Impressum, Datenschutz, Nutzungsbedingungen und Cookie-/Local-Storage-Hinweise sind als App-Routen vorhanden. |

### Chrome Extension

| Bereich | Stand | Aktuelle Funktion |
| --- | --- | --- |
| Chrome Web Store | Live | Manifest-V3-Extension ist im offiziellen Chrome Web Store veroeffentlicht. |
| Wallet-Methodenerkennung | Implementiert | Erkennt `eth_sendTransaction`, `eth_signTransaction`, `eth_sign`, `personal_sign` und `eth_signTypedData*`. |
| Lokale Vorpruefung | Implementiert | Methodenspezifische Regeln, Approval-/Typed-Data-Signale und lokale Site-Reputation. |
| API-Analyse | Implementiert | Uebergibt geeignete Beobachtungen an die Sigil-Produktions-API. |
| Popup-Werkzeuge | Implementiert | Site Check, Copy/Paste Analyzer, History, dApp Sessions, Trusted Sites/Contracts und Einstellungen. |
| Einstellungen-Sync | Implementiert | Optionaler Chrome-Sync fuer Einstellungen und Vertrauenslisten; Analyse- und Session-Historie bleibt lokal. |
| Notification Policy | Implementiert | Critical only, wichtige Risiken oder Off, ohne zusaetzliche Notification-Berechtigung. |
| Security Remediation | **Offen / release-blockierend** | Die aktuelle Provider-Interception wartet auf ein seitengesteuertes `sigil:decision`-Event. Eine boesartige Seite kann dieses Event faelschen. Die freigegebene Neugestaltung macht Sigil rein beratend und entkoppelt Wallet-Ausfuehrung vollstaendig von Seitenevents, Netzwerk und UI. |

### Backend und Betrieb

| Bereich | Stand |
| --- | --- |
| Vercel Web/API Deployment | Implementiert und zuvor produktiv verifiziert; erneuter Release-Smoke-Test nach der Security-Sanierung erforderlich. |
| Neon PostgreSQL | Integriert; `/api/readyz` meldete zuletzt `database.status: ready`. |
| CORS, Helmet, Rate Limiting | Implementiert. |
| Analyse-Retention | Im aktuellen Audit-Worktree auf konfigurierbare 30 Tage ausgerichtet. |
| Oeffentliche Analyse-Links | Umstellung auf nicht erratbare Public IDs befindet sich im aktuellen Audit-Worktree und muss noch sauber committed, deployed und migriert werden. |

## 3. Tech Stack

| Schicht | Technologie |
| --- | --- |
| Monorepo | pnpm Workspaces |
| Runtime / Sprache | Node.js 24, TypeScript 5.9, Vanilla JavaScript fuer die Extension |
| Frontend | React 19, Vite 7, Wouter, TanStack React Query |
| UI | Tailwind CSS 4, Radix UI, Lucide Icons, Framer Motion, Recharts |
| Backend | Express 5, Vercel Serverless Functions, esbuild |
| Datenbank | Neon PostgreSQL, Drizzle ORM, `pg` |
| API-Vertrag | OpenAPI, Orval, Zod-generierte Schemas |
| AI | OpenAI-kompatibler Client ueber OpenRouter; Standardmodell `deepseek/deepseek-v4-flash:free` |
| Blockchain | Etherscan V2 sowie oeffentliche EVM JSON-RPC-Endpunkte |
| Extension | Chrome Manifest V3, Service Worker, Main-World- und Isolated-World-Content-Scripts, Chrome Storage |
| Deployment | Vercel fuer Web-App und API, Neon fuer PostgreSQL |
| Tests | Node Test Runner, TypeScript-Typechecks, Build- und Store-Readiness-Checks |

Wichtige Verzeichnisse:

```text
artifacts/sigil/             React-Web-App
artifacts/api-server/        Express-API
artifacts/sigil-extension/   Chrome-Extension
lib/api-spec/                OpenAPI-Vertrag
lib/api-client-react/        generierter React-API-Client
lib/api-zod/                 generierte Validierungsschemas
lib/db/                      Drizzle-Schema und Datenbankzugriff
docs/                        Produkt-, Release- und Implementierungsdokumente
.compliance/                 EU/DE-Audit und Release-Gates
```

## 4. Screenshots oder UI

![Sigil Web-App Preview](artifacts/sigil/public/opengraph.jpg)

Die produktive UI ist direkt ueber folgende Routen pruefbar:

| UI | URL |
| --- | --- |
| Scanner / Start | [sigil.s3ntrylabs.com](https://sigil.s3ntrylabs.com) |
| Approval Health Check | [sigil.s3ntrylabs.com/approvals](https://sigil.s3ntrylabs.com/approvals) |
| Wallet Monitor | [sigil.s3ntrylabs.com/monitor](https://sigil.s3ntrylabs.com/monitor) |
| Address Watchlist | [sigil.s3ntrylabs.com/watchlist](https://sigil.s3ntrylabs.com/watchlist) |
| Site Reputation | [sigil.s3ntrylabs.com/sites](https://sigil.s3ntrylabs.com/sites) |
| Simulation | [sigil.s3ntrylabs.com/simulate](https://sigil.s3ntrylabs.com/simulate) |
| Intel History | [sigil.s3ntrylabs.com/history](https://sigil.s3ntrylabs.com/history) |
| Extension | [sigil.s3ntrylabs.com/extension](https://sigil.s3ntrylabs.com/extension) |
| Onboarding | [sigil.s3ntrylabs.com/onboarding](https://sigil.s3ntrylabs.com/onboarding) |

Repository-Assets liegen unter `artifacts/sigil/public/` und Extension-Icons unter `artifacts/sigil-extension/icons/`. Ein aktueller, versionierter Screenshot-Satz fuer Desktop, Mobile und Chrome-Store-UI ist noch nicht im Repository gepflegt und sollte im finalen Release-QA aktualisiert werden.

## 5. Datenquellen / APIs

| Quelle | Verwendung | Daten / Hinweise |
| --- | --- | --- |
| Etherscan V2 | Contract-Metadaten, Verifikation, ABI, Token- und Approval-bezogene Explorer-Daten | Benoetigt `ETHERSCAN_API_KEY`; kein Dummy-Key-Fallback. |
| Public EVM JSON-RPC | Transaktionen, Receipts, Bytecode, Storage und On-Chain-Abfragen | Mehrere Fallback-Endpunkte fuer Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain sowie Testnetze. |
| CoinGecko Free API | Token-Preise fuer Simulation und Asset-Darstellung | Mit TTL-Cache und Request-Coalescing im Backend. |
| OpenRouter / Modellprovider | Kontextgebundene Sicherheitsanalyse und Klartext-Erklaerung | OpenAI-kompatible Konfiguration ueber `AI_INTEGRATIONS_OPENAI_BASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY` und optional `SIGIL_AI_MODEL`. |
| Neon PostgreSQL | Persistente Analyseergebnisse und Hall-of-Shame-Daten | Verbindung ueber `DATABASE_URL`; Drizzle ORM. |
| Interne Known-Entity-Daten | Bekannte Protokolle, Exploiter und sanktionierte Adressen | Statisch versionierte Daten im Repository; kein Ersatz fuer eine laufend gepflegte Threat-Intel-Quelle. |
| Lokaler Browser-Speicher | Watchlist, Wallet Monitor, Onboarding, Extension-Historie und Sessions | Web-App nutzt `localStorage`; Extension nutzt `chrome.storage.local` und optional `chrome.storage.sync`. |

Aktuell in den UIs verwendete EVM-Netzwerke sind Ethereum, Polygon, Arbitrum, Optimism, Base, BNB Chain und Sepolia; einzelne Scanner-Oberflaechen bieten derzeit nur die fuenf produktiven Kernnetze an. Die Backend-RPC-Schicht kennt zusaetzlich Goerli.

## 6. Was tatsaechlich schon funktioniert

Nach Code- und Testbestand sind folgende End-to-End-Bausteine vorhanden:

- Eingabe und Klassifikation von Transaction Hashes, Contract-Adressen und rohen Signing-/Transaktionsdaten.
- Streaming-Analyse ueber `/api/sigil/analyze-stream` und normale Analyse ueber `/api/sigil/analyze`.
- Deterministische Risiko-, Approval-, Pattern-, Known-Entity- und OFAC-Pruefungen mit AI-gestuetzter Erklaerung.
- Abruf von EVM-Daten ueber RPC/Etherscan und Preisabfragen ueber CoinGecko.
- Speicherung und Abruf von Analysen ueber PostgreSQL sowie Health-/Readiness-Endpunkte.
- Approval Health Check mit Health Score, unbegrenzten Freigaben, Risikopriorisierung und Revoke.cash-Handoff.
- Lokale Watchlist und Wallet Monitor v1 mit Import/Export und Fix-first-Priorisierung.
- Lokaler Site-Reputation-Check und Copy/Paste-Klassifikation.
- Onboarding-, Extension-, Legal-, History-, Simulation- und Analyseansichten in der Web-App.
- Extension-Popup, lokale Historie, dApp-Session-Zusammenfassungen, optionale Settings-Synchronisierung und API-Handoff.
- Chrome-Store-Listing und produktive API-Domain-Konfiguration.

Wichtige Einschraenkung: "Implementiert" bedeutet, dass der entsprechende Codepfad vorhanden und teilweise automatisiert getestet ist. Es bedeutet nicht, dass jeder externe Provider, jedes Netzwerk oder jeder produktive Browserpfad aktuell zu 100 Prozent verifiziert ist. Der letzte vollstaendige Typecheck/Build war in der Audit-Umgebung wegen eines lokalen TLS-Zertifikatsfehlers beim Dependency-Install nicht erneut ausfuehrbar.

## 7. Was bisher nur geplant ist

### Bereits freigegeben, als Naechstes umzusetzen

- Extension in ein rein beratendes Modell umbauen: Der originale Wallet-Provider wird exakt einmal und unabhaengig von Sigil ausgefuehrt; Seiten koennen keine Sigil-Entscheidung mehr faelschen oder die Provider-Ausfuehrung steuern.
- Untrusted-Observation-Gate mit Groessen-, Tiefen-, Alters-, Rate-, Queue- und Deduplication-Limits.
- Advisory Overlay ohne "Proceed"- oder "Cancel request"-Steuerung; neue Session-Zustaende `observed`, `reviewed` und `analysis_failed`.
- Extension-, Store-, Datenschutz- und Whitepaper-Texte an das beratende Sicherheitsmodell anpassen.
- Deterministisches Extension-Paket bauen, Security-Regressionstests ausfuehren und EU/DE-Audit-Gate erneut bewerten.

### Premium Wallet Monitor

- Optionale Wallet-Verbindung nur zur bequemeren Auswahl oeffentlicher Adressen, ohne Custody oder Signing-Rechte.
- Scam-Interaction-Historie und verdachtige Contract-Exposition ueber Approval-Daten hinaus.
- Laufende Alerts fuer neue kritische Expositionen und Risk-Aenderungen.
- Free-, Sigil-Plus- und Sigil-Pro-Limits sowie Billing/Entitlements.
- Mehrere Wallets, tiefere Historie, erweiterte Alerts und exportierbare Pro-Reports.

### Security Decision Assistant

- Kontextgebundener Assistent in Transaktions-, Contract-, Approval-, Paste- und Wallet-Monitor-Ergebnissen.
- Vordefinierte Sicherheitsfragen, Grounding in Sigil-Signalen und klare Grenzen gegen Trading-, Investment-, Steuer- und allgemeine Web3-Beratung.
- Qualitaets- und Safety-Evaluationen sowie gestaffelte Free/Plus/Pro-Nutzung.

### Spaetere Integration und Intelligence

- Stabile, authentifizierte und monetarisierte Team/API-Oberflaeche ab EUR 99/Monat.
- JavaScript SDK, Wallet-/dApp-Adapter, signierter Threat-Signal-Feed und Partner-Integrationen.
- Erweiterte Threat-Intel-Registry, Contract-Upgrade-Monitoring und historische Exploit-Regressionstests.
- Community Threat Reports mit interner Pruefung und optionale Webhooks.
- Mobile App, Hardware-Wallet-Plugins, DAO Threat Intelligence und Mempool-Produkt bleiben bewusst zurueckgestellt.

## Verbindliche Statusquellen

- Produkt-Roadmap: [`sigil-whitepaper.md`](sigil-whitepaper.md#17-roadmap)
- Aktuelles Security-Design: [`docs/superpowers/specs/2026-09-28-advisory-extension-security-design.md`](docs/superpowers/specs/2026-09-28-advisory-extension-security-design.md)
- EU/DE-Release-Audit: [`.compliance/COMPLIANCE_AUDIT.md`](.compliance/COMPLIANCE_AUDIT.md)
- Release-Checkliste: [`.compliance/RELEASE_CHECKLIST.md`](.compliance/RELEASE_CHECKLIST.md)
- Chrome-Store-Unterlagen: [`docs/chrome-web-store-submission.md`](docs/chrome-web-store-submission.md)
- Production-QA: [`docs/production-qa-matrix.md`](docs/production-qa-matrix.md)

