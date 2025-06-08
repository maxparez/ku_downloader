# ESF Downloader - Testing Guide

## Phase 1: Manual Analysis with Network Analyzer

### Příprava testování

1. **Spuštění Chrome v debug módu:**
```bash
google-chrome --remote-debugging-port=9222 --disable-web-security --user-data-dir=/tmp/chrome-debug
```

2. **Spuštění analyzeru:**
```bash
npm run analyze
```

### Testovací workflow pro projekt č. 740

#### Krok 1: Zahájení nahrávání
```
analyzer> start 740
```
→ Analyzer začne zaznamenávat veškerý network traffic

#### Krok 2: Manuální navigace a přihlášení
1. V Chrome přejděte na ESF portál
2. Přihlaste se přes identita.gov.cz
3. Označte dokončení přihlášení:
```
analyzer> marker "logged-in"
```

#### Krok 3: Navigace na projekt 740
1. Najděte a přejděte na stránku projektu č. 740
2. Označte načtení stránky projektu:
```
analyzer> marker "project-page-loaded"
```

#### Krok 4: Analýza struktury stránky
1. Prozkoumejte strukturu stránky s kartami účastníků
2. Najděte download linky nebo tlačítka
3. Označte objevení download prvků:
```
analyzer> marker "found-download-links"
```

#### Krok 5: Test PDF stažení
1. Klikněte na jeden z download linků
2. Stáhněte alespoň jeden PDF soubor
3. Označte úspěšné stažení:
```
analyzer> marker "pdf-downloaded"
```

#### Krok 6: Ukončení nahrávání
```
analyzer> stop
```
→ Analyzer uloží data do souboru `analysis/esf_analysis_[timestamp]_projekt_740.json`

### Analýza výsledků

Po dokončení se vytvoří soubor s následujícími daty:

#### Network Requests
- Všechny HTTP požadavky (URL, metoda, headers, postData)
- Specificky zachycené requests z domén `esf.gov.cz` a `identita.gov.cz`
- PDF download requests

#### Network Responses  
- HTTP odpovědi s status kódy a headers
- Response body pro JSON a HTML odpovědi z ESF/identita portálů
- Error responses (4xx, 5xx)

#### Page Events
- Navigační události (změny URL)
- Manuální markery označující klíčové kroky
- DOM změny a user actions

#### Session Data
- Cookies (včetně authentication cookies)
- localStorage a sessionStorage
- Bezpečnostní stav (HTTPS, certifikáty)

### Co hledáme v analýze

#### Authentication Flow
- Redirect sekvence mezi ESF a identita portály
- Authentication cookies a jejich názvy
- Session management parametry

#### Project Page Structure
- URL pattern pro projekty (ověření současného `/CZ.02.02.XX/00/24_034/{projectNumber}/ucastnici`)
- HTML struktura s kartami účastníků
- CSS selectors pro PDF download linky

#### PDF Download Mechanism
- Jak funguje download (direct link vs. POST request vs. JavaScript)
- Potřebné headers pro authenticated downloads
- File naming conventions

#### API Endpoints
- REST/GraphQL endpoints pokud jsou používané
- Authentication requirements pro API calls
- Data formáty (JSON responses)

## Phase 2: Implementace na základě analýzy

Po analýze dat aktualizujeme:

### ESFPortal.ts
- Přesné selectors pro PDF discovery
- Správné URL building patterns
- Authentication detection logic

### FileManager.ts
- Správná download strategie (Chrome navigation vs. HTTP fetch)
- Potřebné headers pro authenticated requests
- Error handling pro specifické ESF responses

### SessionManager.ts
- Cookie management
- Session validation
- Authentication state detection

## Expected Analysis Outputs

### Úspěšná analýza by měla obsahovat:
- ✅ Authentication redirect flow (identita.gov.cz ↔ esf.gov.cz)
- ✅ Session cookies a jejich názvy
- ✅ Project page URL struktura
- ✅ HTML selectors pro participant cards
- ✅ PDF download URLs a metody
- ✅ Error handling patterns

### Typické problémy k řešení:
- 🔍 JavaScript-based PDF generation
- 🔍 CSRF tokens pro download requesty
- 🔍 Session timeout handling
- 🔍 Rate limiting detection
- 🔍 Different layouts for different project types

## Next Steps

Po dokončení analýzy:

1. **Aktualizace ESF portal logic** na základě real-world dat
2. **Testing automated download** s projektem č. 740
3. **Refinement** download strategií
4. **Documentation** finálních patterns pro produkční použití

## Troubleshooting

### Chrome connection issues
```bash
# Zkontrolujte Chrome debug port
curl http://localhost:9222/json/version

# Restartujte Chrome s debug módem
pkill chrome
google-chrome --remote-debugging-port=9222 --disable-web-security --user-data-dir=/tmp/chrome-debug
```

### Analyzer issues
```bash
# Zkontrolujte logs
tail -f logs/esf-downloader.log

# Build před spuštěním
npm run build
npm run analyze
```