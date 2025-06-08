# ESF ČR Downloader - CLI Specifikace

## Přehled
Aplikace přijímá čísla projektů z příkazového řádku nebo ze souboru a stahuje PDF karty účastníků z ESF ČR portálu.

## Formát čísla projektu

### Úplný formát
```
CZ.02.02.XX/00/24_034/0009356
```

### Podporované vstupy
- `0009356` (plný 7-místný formát s vedoucími nulami)
- `009356` (6-místný formát)
- `9356` (bez vedoucích nul)

### Normalizace
Aplikace automaticky doplní vedoucí nuly na 7 míst: `9356` → `0009356`

## CLI Interface

### 1. Přímé zadání čísel projektů
```bash
# Jeden projekt
npm run download -- --projects 9356

# Více projektů (oddělené čárkami)
npm run download -- --projects 9356,7890,1234

# S plnými čísly
npm run download -- --projects 0009356,0007890,0001234
```

### 2. Čtení ze souboru
```bash
# Ze souboru projects.txt
npm run download -- --file projects.txt

# Alternativní cesta
npm run download -- --file /path/to/projects.txt
```

### 3. Kombinace parametrů
```bash
# Soubor + dodatečné projekty
npm run download -- --file projects.txt --projects 9356,7890

# S dalšími možnostmi
npm run download -- --projects 9356 --output ./downloads --verbose
```

## Formát vstupního souboru

### Soubor: projects.txt
```
9356
007890
1234
0009999
```

### Pravidla
- Jeden projekt na řádek
- Prázdné řádky jsou ignorovány
- Komentáře začínající `#` jsou ignorovány
- Whitespace je automaticky odstraněn

### Příklad se komentáři
```
# Seznam projektů pro stažení
9356        # Projekt A
007890      # Projekt B  
1234        # Projekt C

# Další batch
0009999
```

## CLI Parametry

### Povinné
- `--projects <numbers>` NEBO `--file <path>` - musí být zadán alespoň jeden

### Volitelné
```bash
--output <path>        # Výstupní adresář (default: ./downloads)
--verbose              # Detailní výstup
--rate-limit <ms>      # Rate limiting v ms (default: 1000)
--retry <count>        # Počet opakování při chybě (default: 3)
--format <type>        # Formát výstupu: pdf|json|both (default: pdf)
--no-session-reuse     # Nevyužívat existující session
--dry-run              # Pouze simulace, bez stahování
```

## Příklady použití

### Základní použití
```bash
# Stáhnout jeden projekt
npm run download -- --projects 9356

# Stáhnout ze souboru
npm run download -- --file projects.txt
```

### Pokročilé použití
```bash
# Více projektů s custom nastavením
npm run download -- \
  --projects 9356,7890,1234 \
  --output ./projekty \
  --rate-limit 2000 \
  --verbose

# Dry run pro testování
npm run download -- \
  --file projects.txt \
  --dry-run \
  --verbose
```

## Výstupní struktura

### Adresářová struktura
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

### Metadata soubor
```json
{
  "projectNumber": "0009356",
  "downloadDate": "2024-06-08T10:30:00Z",
  "totalCards": 15,
  "successfulDownloads": 15,
  "errors": [],
  "session": {
    "startTime": "2024-06-08T10:25:00Z",
    "endTime": "2024-06-08T10:35:00Z"
  }
}
```

## Error Handling

### Neplatné číslo projektu
```bash
$ npm run download -- --projects abc123
Error: Neplatné číslo projektu: 'abc123'. Povoleny jsou pouze číslice.
```

### Neexistující soubor
```bash
$ npm run download -- --file neexistuje.txt
Error: Soubor 'neexistuje.txt' nebyl nalezen.
```

### Žádné karty v projektu
```bash
$ npm run download -- --projects 9356
Warning: Projekt '0009356' neobsahuje žádné karty účastníků.
```

## Architektura CLI

### Core Integration
CLI funguje jako thin wrapper nad core business logikou:

```typescript
// CLI je pouze interface nad core engine
class CLIApp {
  constructor(private engine: DownloadEngine) {
    this.setupEventHandlers();
  }
  
  async run(args: CLIArgs): Promise<void> {
    const config = ConfigManager.fromCLI(args);
    await this.engine.downloadProjects(config.projects);
  }
  
  private setupEventHandlers(): void {
    this.engine.on('progress', this.showProgress);
    this.engine.on('error', this.showError);
    this.engine.on('complete', this.showComplete);
  }
}
```

### Implementační detaily

#### Validace čísla projektu (ProjectManager)
```typescript
class ProjectManager {
  validateProjectNumber(input: string): string {
    const cleaned = input.trim();
    
    if (!/^\d+$/.test(cleaned)) {
      throw new Error(`Neplatné číslo projektu: '${input}'`);
    }
    
    return cleaned.padStart(7, '0');
  }
}
```

#### URL pattern pro ESF (ProjectManager)
```typescript
class ProjectManager {
  buildProjectUrl(projectNumber: string): string {
    const normalized = this.validateProjectNumber(projectNumber);
    return `https://esf.gov.cz/projekty/CZ.02.02.XX/00/24_034/${normalized}/ucastnici`;
  }
}
```

#### Configuration Management
```typescript
class ConfigManager {
  static fromCLI(args: CLIArgs): AppConfig {
    return {
      projects: args.projects || [],
      inputFile: args.file,
      outputDir: args.output || './downloads',
      rateLimit: args.rateLimit || 1000,
      retryAttempts: args.retry || 3,
      verbose: args.verbose || false,
      dryRun: args.dryRun || false
    };
  }
}
```

### Rate limiting (DownloadEngine)
- Default: 1 request per second
- Konfigurovatelné přes `--rate-limit`
- Respektování ESF server limits
- Exponential backoff při error 429

## Logování

### Console output
```
[INFO] Zpracování projektu: 0009356
[INFO] Nalezeno 15 karet účastníků
[PROGRESS] Stahování: 3/15 (20%)
[SUCCESS] Projekt 0009356 dokončen: 15/15 karet
[ERROR] Projekt 0007890: Session timeout
```

### Log soubory
- `logs/download-YYYY-MM-DD.log` - Detailní log
- `downloads/download_log.json` - Strukturovaný log

## Event-Driven Updates

### Progress Events
```typescript
engine.on('progress', (event: ProgressEvent) => {
  if (config.verbose) {
    console.log(`[${event.projectNumber}] ${event.progress.current}/${event.progress.total}`);
  }
  updateProgressBar(event.progress.percentage);
});
```

### Error Events  
```typescript
engine.on('error', (event: ErrorEvent) => {
  console.error(`❌ ${event.type}: ${event.message}`);
  if (event.projectNumber) {
    console.error(`   Projekt: ${event.projectNumber}`);
  }
});
```

## Future GUI Compatibility

CLI architektura je navržena tak, aby core funkcionalita byla sdílená s budoucím GUI:

- **Same Core Engine**: GUI bude používat stejný DownloadEngine
- **Same Events**: GUI se bude subscribovat na stejné events
- **Same Configuration**: ConfigManager.fromGUI() místo fromCLI()
- **Same Validation**: Stejná validace a business rules