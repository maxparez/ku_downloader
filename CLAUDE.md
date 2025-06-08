# ESF ČR Downloader - Projekt dokumentace

## Přehled projektu
Aplikace pro stahování PDF dokumentů (karet účastníků) z portálu ESF ČR přes autentizaci identita.gov.cz.

## Architektura
- **Fáze 1**: Analyzer - zachytává network traffic při manuálním procházení
- **Fáze 2**: Downloader - automatizované stahování na základě analýzy

## Technické požadavky
- Node.js 18+ + TypeScript 5.0+
- Puppeteer + Chrome Remote Interface pro Chrome připojení
- WSL2 Ubuntu prostředí
- Chrome 137.0.7151.68 + ChromeDriver 137.0.7151.68
- Maximální velikost souborů: 500 řádků
- Důsledné logování všech operací (Winston)

## Principy kódu
- **KISS** (Keep It Simple, Stupid)
- **DRY** (Don't Repeat Yourself)
- **Separation of Concerns** (UI vs Business Logic)
- **Event-driven architecture** (Core emits events, UI subscribes)
- **GUI-ready design** (Core nezávislý na CLI/GUI)
- **Modulární architektura**
- **Comprehensive error handling**
- **TypeScript strict mode**

## GUI-Ready Architektura
```
src/
├── core/                    # Business logic (GUI-independent)
│   ├── DownloadEngine.ts    # Main download engine
│   ├── ProjectManager.ts    # Project validation & management
│   ├── SessionManager.ts    # Chrome session handling
│   └── FileManager.ts       # File operations
├── interfaces/              # Frontends (multiple UI možnosti)
│   ├── cli/                 # Command line interface
│   │   ├── index.ts         # CLI entry point
│   │   ├── args.ts          # Argument parsing
│   │   └── progress.ts      # CLI progress display
│   └── gui/                 # Future GUI implementations
│       ├── electron/        # Desktop app (future)
│       └── web/             # Web interface (future)
├── events/                  # Event-driven communication
│   ├── EventEmitter.ts      # Progress, errors, status
│   └── types.ts             # Event type definitions
├── config/                  # Configuration management
│   ├── ConfigManager.ts     # Config abstraction
│   └── defaults.ts          # Default settings
└── utils/                   # Shared utilities
    ├── logger.ts            # Centralized logging (Winston)
    └── chrome.ts            # Chrome connection utilities
```

## Bezpečnost
- Žádné ukládání přihlašovacích údajů
- Cookies pouze v paměti
- Respektování rate limits
- Logování bez citlivých dat

## Příkazy
```bash
npm run analyze    # Spustí network analyzer
npm run download   # Spustí automatické stahování
npm run lint       # ESLint kontrola kódu
npm run typecheck  # TypeScript type checking
npm run test       # Spustí testy
npm run build      # Sestaví produkční verzi
```

## Chrome Setup
```bash
# Spuštění Chrome v debug módu
google-chrome --headless --disable-gpu --remote-debugging-port=9222 --no-sandbox --disable-dev-shm-usage

# Test připojení
node test-chrome.js
curl http://localhost:9222/json/version
```

## Workflow
1. Spusť Chrome v debug módu: `--remote-debugging-port=9222`
2. Přihlas se manuálně přes identita.gov.cz na ESF portál
3. Připrav čísla projektů (CLI argument nebo soubor)
4. Spusť downloader: `npm run download -- --projects 9356,7890`
5. Aplikace automaticky:
   - Normalizuje čísla projektů (9356 → 0009356)
   - Builduje ESF URLs (CZ.02.02.XX/00/24_034/0009356)
   - Stahuje PDF karty účastníků (typicky 10-20, max 30)
   - Organizuje soubory do adresářů podle projektů

## CLI Interface
```bash
# Základní použití
npm run download -- --projects 9356
npm run download -- --file projects.txt

# S parametry
npm run download -- --projects 9356,7890 --output ./projekty --verbose
```

## Aktuální stav prostředí
- ✅ Chrome 137.0.7151.68 (funkční)
- ✅ ChromeDriver 137.0.7151.68 (aktualizován, kompatibilní)
- ✅ Chrome remote debugging na portu 9222 (testováno)
- ✅ WSL2 Ubuntu prostředí (připraveno)
- ✅ Git repozitář vytvořen (github.com/maxparez/ku_downloader)

## Implementační plán
Viz `PROJECT_PLAN.md` pro detailní roadmap:
- **Týden 1**: GUI-ready architecture + Core classes + Event system
- **Týden 2**: CLI interface + Project management + Configuration
- **Týden 3**: Chrome integration + Download engine + File operations
- **Týden 4**: Testing + Documentation + GUI preparation

## Budoucí GUI možnosti
- **Electron**: Desktop aplikace (Windows, Mac, Linux)
- **Web Interface**: Browser-based UI (Express + React)
- **Tauri**: Lightweight desktop alternative
- **Native**: Platform-specific GUI (Qt, .NET)

## Git Workflow

- **Commit frequently**: Every 2 hours or after completing a feature
- **Use tags**: [feat-XXX], [fix-XXX], [refactor-XXX], [test-XXX], [docs-XXX]
- **Push to GitHub**: Minimum 2x per day, always before breaks
- **Branch strategy**: main → develop → feature/fix branches
- **See docs/GIT_WORKFLOW.md** for detailed Git workflow and conventions
- **Always do commit & push**

### Quick Git Commands
```bash
# Quick save work in progress
git add -A && git commit -m "[chore-$(date +%Y%m%d)] WIP: Save progress" && git push

# Create tagged commit
git commit -m "[feat-005] Add new feature description"
git push origin $(git branch --show-current)
```

## Známé limity
- Vyžaduje manuální přihlášení přes identita.gov.cz
- Session timeout handling (nutné občasné obnovení)
- Rate limiting na ESF portálu (respektování limitů)
- Chrome závislost (nutný debug mód)