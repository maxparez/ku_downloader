# ESF ČR Downloader - Plán implementace

## Fáze 1: Základní setup a architektura

### 1.1 Projekt inicializace
- [x] Vytvoření Git repozitáře
- [x] Konfigurace TypeScript
- [x] Instalace základních závislostí
- [x] Setup Puppeteer
- [x] Testování Chrome připojení

### 1.2 GUI-ready architektura
- [ ] Vytvoření core/ adresářové struktury (business logic)
- [ ] Vytvoření interfaces/ struktury (CLI/GUI frontends)
- [ ] Event system implementace
- [ ] Configuration manager (GUI-independent)
- [ ] Logger implementace
- [ ] TypeScript types definice

### 1.3 Chrome debug připojení
- [x] Testování Chrome remote debugging
- [x] Aktualizace ChromeDriver na verzi 137
- [ ] Implementace Chrome connection manageru
- [ ] Error handling pro connection

## Fáze 2: Core Engine - Business Logic

### 2.1 Download Engine (core/)
- [ ] DownloadEngine class (GUI-independent)
- [ ] ProjectManager class (validation & normalization)
- [ ] SessionManager class (Chrome session handling)
- [ ] FileManager class (file operations)

### 2.2 Event System
- [ ] EventEmitter implementace
- [ ] Progress events (download, validation, errors)
- [ ] Status reporting system
- [ ] Error event handling

### 2.3 Configuration Management
- [ ] ConfigManager class (abstraction layer)
- [ ] Default configuration
- [ ] Environment variable support
- [ ] Multiple config sources (CLI, file, GUI)

## Fáze 3: CLI Interface - Command Line Frontend

### 3.1 CLI Implementation (interfaces/cli/)
- [ ] CLIApp class (thin wrapper nad core)
- [ ] Argument parsing (projects, file, options)
- [ ] Progress bar implementation
- [ ] Error display formatting

### 3.2 CLI Features
- [ ] Project number validation a normalization
- [ ] File input processing
- [ ] Verbose output mode
- [ ] Dry-run capability

### 3.3 CLI Integration
- [ ] Event subscription (progress, errors)
- [ ] Configuration from CLI args
- [ ] Exit codes a error handling
- [ ] Help a usage documentation

## Fáze 4: Integration & Testing

### 4.1 Core Testing
- [ ] Unit testy pro core classes
- [ ] Integration testy (Chrome connection)
- [ ] Mock testing (ESF API responses)
- [ ] Error scenario testing

### 4.2 CLI Testing
- [ ] CLI argument parsing tests
- [ ] File input validation tests
- [ ] Output formatting tests
- [ ] End-to-end CLI scenarios

### 4.3 Documentation & Deployment
- [x] README.md
- [x] CLAUDE.md update
- [x] CLI_SPECIFICATION.md
- [ ] ARCHITECTURE.md
- [ ] API documentation pro core
- [ ] Build process a package.json scripts

## Fáze 5: GUI Preparation (Budoucí rozšíření)

### 5.1 GUI Foundation
- [ ] UIAdapter interface definice
- [ ] GUI event handling specification
- [ ] Configuration UI requirements
- [ ] Progress display requirements

### 5.2 Technology Choice
- [ ] Electron desktop app prototyp
- [ ] Web interface prototyp (Express + React)
- [ ] Tauri evaluation
- [ ] Technology comparison a decision

### 5.3 GUI Implementation (Future)
- [ ] GUI project struktura
- [ ] Core integration s GUI
- [ ] User experience design
- [ ] Cross-platform testing

## Prioritní úkoly (tento týden)

1. **Vysoká priorita**
   - GUI-ready architektura setup
   - Core classes implementace (DownloadEngine, ProjectManager)
   - Event system základy
   - Configuration manager

2. **Střední priorita**
   - CLI interface implementace
   - Chrome connection handling
   - File management basics
   - Error handling framework

3. **Nízká priorita**
   - Advanced CLI features
   - Performance optimizations
   - GUI preparation specs

## Technické detaily

### Dependencies
```json
{
  "puppeteer": "^21.0.0",
  "chrome-remote-interface": "^0.33.3",
  "@types/node": "^20.0.0",
  "typescript": "^5.0.0",
  "winston": "^3.0.0",
  "commander": "^11.0.0",
  "eventemitter3": "^5.0.0"
}
```

### Future GUI Dependencies
```json
{
  "electron": "^27.0.0",
  "electron-builder": "^24.0.0",
  "express": "^4.18.0",
  "react": "^18.0.0",
  "@tauri-apps/api": "^1.5.0"
}
```

### Vývojové nástroje
- ESLint pro code quality
- Prettier pro formatting
- Jest pro testing
- TypeScript strict mode

### Prostředí
- WSL2 Ubuntu
- Node.js 18+
- Chrome 137.0.7151.68
- ChromeDriver 137.0.7151.68

## Rizika a mitigace

### Technická rizika
1. **Chrome session instability**
   - Mitigace: Robust reconnection logic
   
2. **ESF ČR rate limiting**
   - Mitigace: Adaptive rate limiting
   
3. **Authentication token expiry**
   - Mitigace: Token refresh mechanism

### Provozní rizika
1. **Portal structure changes**
   - Mitigace: Flexible selectors, monitoring
   
2. **Network interruptions**
   - Mitigace: Resume capability, robust error handling

## Milestones

- **Week 1**: GUI-ready architecture + Core classes + Event system
- **Week 2**: CLI interface + Project management + Configuration
- **Week 3**: Chrome integration + Download engine + File operations
- **Week 4**: Testing + Documentation + GUI preparation

## Success Criteria

- [ ] Úspěšné připojení k Chrome debug session
- [ ] Zachytávání network trafficu z ESF ČR
- [ ] Automatické stahování PDF souborů
- [ ] Robust error handling a logging
- [ ] Dokumentace a usage examples