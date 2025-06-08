# ESF ČR Downloader - Projekt dokumentace

## Přehled projektu
Aplikace pro stahování PDF dokumentů (karet účastníků) z portálu ESF ČR přes autentizaci identita.gov.cz.

## Architektura
- **Fáze 1**: Analyzer - zachytává network traffic při manuálním procházení
- **Fáze 2**: Downloader - automatizované stahování na základě analýzy

## Technické požadavky
- Node.js + TypeScript
- Puppeteer pro připojení k Windows Chrome
- WSL Ubuntu prostředí
- Maximální velikost souborů: 500 řádků
- Důsledné logování všech operací

## Principy kódu
- KISS (Keep It Simple, Stupid)
- DRY (Don't Repeat Yourself)
- Modulární architektura
- Comprehensive error handling
- TypeScript strict mode

## Struktura projektu
```
src/
├── analyzer/      # Network traffic analyzer
├── downloader/    # PDF downloader
├── auth/          # Authentication handling
├── utils/         # Shared utilities
│   └── logger.ts  # Centralized logging
└── types/         # TypeScript definitions
```

## Bezpečnost
- Žádné ukládání přihlašovacích údajů
- Cookies pouze v paměti
- Respektování rate limits
- Logování bez citlivých dat

## Příkazy
```bash
npm run analyze    # Spustí analyzer
npm run download   # Spustí downloader
npm run lint       # ESLint kontrola
npm run typecheck  # TypeScript kontrola
```

## Workflow
1. Uživatel spustí Chrome s `--remote-debugging-port=9222`
2. Přihlásí se přes identita.gov.cz
3. Aplikace se připojí a analyzuje/stahuje data

## Známé limity
- Vyžaduje manuální přihlášení
- Session timeout handling
- Rate limiting na ESF portálu