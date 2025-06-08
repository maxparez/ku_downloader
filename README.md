# ESF ČR PDF Downloader

Automatizovaný nástroj pro stahování PDF dokumentů (karet účastníků) z portálu ESF ČR s autentizací přes identita.gov.cz.

## 🎯 Účel

Tento projekt umožňuje efektivní a automatizované stahování PDF dokumentů (karet účastníků) z ESF ČR portálu pomocí příkazového řádku nebo (v budoucnu) grafického rozhraní.

### 🏗️ Architektura

Aplikace používá **GUI-ready architekturu** s oddělením business logiky od uživatelského rozhraní:

- **Core Engine**: Business logika nezávislá na UI (stahování, validace, session management)
- **CLI Interface**: Příkazový řádek pro immediate použití
- **Event System**: Event-driven komunikace mezi komponentami
- **Future GUI**: Architektura připravená pro budoucí grafické rozhraní (Electron, Web)

## 🔧 Technické požadavky

### Systémové požadavky
- **OS**: WSL2 Ubuntu nebo Linux
- **Node.js**: 18+ 
- **Chrome**: 137.0.7151.68+ (s debug podporou)
- **ChromeDriver**: 137.0.7151.68+ (kompatibilní s Chrome)

### Závislosti
```bash
npm install puppeteer chrome-remote-interface winston
```

## 🚀 Rychlý start

### 1. Instalace
```bash
git clone https://github.com/maxparez/ku_downloader.git
cd ku_downloader
npm install
```

### 2. Spuštění Chrome v debug módu
```bash
google-chrome --headless --disable-gpu --remote-debugging-port=9222 --no-sandbox --disable-dev-shm-usage
```

### 3. Test připojení
```bash
node test-chrome.js
```

### 4. Spuštění aplikace

#### Stahování konkrétních projektů
```bash
# Jeden projekt (číslo bez vedoucích nul)
npm run download -- --projects 9356

# Více projektů (oddělené čárkami)
npm run download -- --projects 9356,7890,1234

# Ze souboru projects.txt (jeden projekt na řádek)
npm run download -- --file projects.txt

# S dodatečnými parametry
npm run download -- --projects 9356 --output ./moje-projekty --verbose
```

#### Formát čísel projektů
- Úplný formát: `CZ.02.02.XX/00/24_034/0009356`
- Podporované vstupy: `9356`, `009356`, `0009356`
- Aplikace automaticky doplní vedoucí nuly

#### Analyzer (pro vývoj a debugging)
```bash
npm run analyze    # Monitoring network traffic
```

## 📁 Struktura projektu

```
ku_downloader/
├── src/
│   ├── core/                    # Business logic (GUI-independent)
│   │   ├── DownloadEngine.ts    # Main download engine
│   │   ├── ProjectManager.ts    # Project validation & management
│   │   ├── SessionManager.ts    # Chrome session handling
│   │   └── FileManager.ts       # File operations
│   ├── interfaces/              # User interfaces (CLI, future GUI)
│   │   ├── cli/                 # Command line interface
│   │   │   ├── index.ts         # CLI entry point
│   │   │   ├── args.ts          # Argument parsing
│   │   │   └── progress.ts      # Progress display
│   │   └── gui/                 # Future GUI implementations
│   │       ├── electron/        # Desktop app (planned)
│   │       └── web/             # Web interface (planned)
│   ├── events/                  # Event-driven communication
│   │   ├── EventEmitter.ts      # Progress, errors, status
│   │   └── types.ts             # Event type definitions
│   ├── config/                  # Configuration management
│   │   ├── ConfigManager.ts     # Config abstraction
│   │   └── defaults.ts          # Default settings
│   └── utils/                   # Shared utilities
│       ├── logger.ts            # Centralized logging
│       └── chrome.ts            # Chrome connection
├── logs/                        # Application logs
├── downloads/                   # Downloaded PDF files
├── test-chrome.js              # Chrome connection test
├── package.json
├── tsconfig.json
├── CLAUDE.md                   # Development documentation
├── PROJECT_PLAN.md             # Implementation plan
├── ARCHITECTURE.md             # Architecture documentation
├── CLI_SPECIFICATION.md        # CLI specification
└── README.md                   # This file
```

## 🔄 Workflow

### Základní použití 
1. Připravte čísla projektů (např. do souboru `projects.txt`):
   ```
   9356
   7890
   1234
   ```
2. Spusťte stahování: `npm run download -- --file projects.txt`
3. Downloader automaticky stáhne PDF karty účastníků z každého projektu
4. Soubory jsou organizovány do strukturovaných složek
5. Progress a errors jsou logovány

### Výstupní struktura
```
downloads/
├── projekt_0009356/
│   ├── karta_001.pdf
│   ├── karta_002.pdf
│   └── metadata.json
├── projekt_0007890/
│   ├── karta_001.pdf
│   └── metadata.json
└── download_log.json
```

## ⚙️ Konfigurace

### Environment variables
```bash
# Chrome debug port (default: 9222)
CHROME_DEBUG_PORT=9222

# Download directory (default: ./downloads)
DOWNLOAD_DIR=./downloads

# Log level (default: info)
LOG_LEVEL=info

# Rate limiting (default: 1000ms)
RATE_LIMIT_MS=1000
```

### Dostupné příkazy
```bash
# Stahování PDF karet
npm run download -- --projects 9356,7890      # Konkrétní projekty
npm run download -- --file projects.txt       # Ze souboru
npm run download -- --projects 9356 --verbose # S detailním výstupem

# Vývoj a maintenance
npm run analyze      # Network analyzer (pro vývoj)
npm run lint         # ESLint code kontrola
npm run typecheck    # TypeScript type checking  
npm run test         # Spustí testy
npm run build        # Sestaví produkční verzi
```

### CLI parametry
```bash
--projects <numbers>   # Čísla projektů oddělená čárkami
--file <path>          # Cesta k souboru s čísly projektů
--output <path>        # Výstupní adresář (default: ./downloads)
--verbose              # Detailní výstup
--rate-limit <ms>      # Rate limiting v ms (default: 1000)
--retry <count>        # Počet opakování při chybě (default: 3)
--dry-run              # Pouze simulace bez stahování
```

## 🛡️ Bezpečnost

- **Žádné ukládání credentials**: Přihlašovací údaje nejsou nikde ukládány
- **In-memory cookies**: Session cookies jsou drženy pouze v paměti
- **Rate limiting**: Respektování limitů ESF ČR serveru
- **Secure logging**: Logování bez citlivých dat

## 📝 Logování

Aplikace vytváří detailní logy v adresáři `logs/`:

```
logs/
├── analyzer-YYYY-MM-DD.log      # Analyzer aktivity
├── downloader-YYYY-MM-DD.log    # Download aktivity
├── errors-YYYY-MM-DD.log        # Error logy
└── combined-YYYY-MM-DD.log      # Všechny logy dohromady
```

## 🔍 Monitoring

### Health check
```bash
curl http://localhost:9222/json/version  # Chrome debug status
```

### Status kontrola
```bash
npm run status  # Kontrola stavu všech komponent
```

## ⚠️ Známá omezení

1. **Manuální přihlášení**: Vyžaduje ruční autentizaci přes identita.gov.cz
2. **Session timeout**: Nutné občasné obnovení session
3. **Rate limiting**: ESF ČR portál má omezení na počet požadavků
4. **Chrome závislost**: Vyžaduje spuštěný Chrome v debug módu

## 🐛 Troubleshooting

### Chrome se nepřipojí
```bash
# Zkontrolujte, zda Chrome běží v debug módu
curl http://localhost:9222/json/version

# Restartujte Chrome
pkill chrome
google-chrome --headless --remote-debugging-port=9222 --no-sandbox
```

### Network errors
```bash
# Zkontrolujte logy
tail -f logs/errors-$(date +%Y-%m-%d).log

# Ověřte internet connectivity
ping esf.gov.cz
```

### Session expiry
```bash
# Restartujte analyzer a přihlaste se znovu
npm run analyze
```

## 📋 Development

### Přispívání
1. Fork repository
2. Vytvořte feature branch: `git checkout -b feature/nova-funkcnost`
3. Commit změny: `git commit -m 'Přidána nová funkcnost'`
4. Push do branch: `git push origin feature/nova-funkcnost`
5. Otevřete Pull Request

### Code style
- TypeScript strict mode
- ESLint + Prettier
- Conventional commits
- 100% test coverage cíl

## 📄 Licence

MIT License - viz LICENSE soubor

## 🚀 Budoucí rozšíření

### Plánované GUI možnosti
- **Electron Desktop App**: Native desktop aplikace pro Windows, Mac, Linux
- **Web Interface**: Browser-based rozhraní s React frontend
- **Tauri App**: Lightweight desktop alternative

### Architektonické výhody
- **Separation of Concerns**: UI nezávislé na business logice
- **Event-driven**: Real-time progress updates pro GUI
- **Testovatelnost**: Core komponenty testovatelné bez UI
- **Extensibility**: Snadné přidání nových UI technologií

## 🤝 Podpora

Pro podporu a hlášení chyb:
- Otevřete GitHub Issue
- Kontaktujte vývojáře: max.parez@seznam.cz

---

**⚡ Quick tips:**
- Vždy spusťte Chrome v debug módu před spuštěním aplikace
- Pravidelně kontrolujte logy pro monitoring aktivit
- Používejte rate limiting pro předcházení blokování IP
- Architektura je připravena pro budoucí GUI rozšíření