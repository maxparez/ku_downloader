# ESF ČR Downloader - Project Plan & Roadmap

**Celkový cíl**: Automatizované stahování PDF karet účastníků z ESF ČR portálu  
**Architektura**: GUI-ready design s CLI interface, připraveno pro budoucí GUI rozšíření  
**Status**: ✅ Week 3 Complete - Fáze testování s real-world daty

## ✅ COMPLETED PHASES

### Phase 1: Foundation & Architecture ✅
- [x] **Project Setup**: Git repo, TypeScript config, dependencies
- [x] **GUI-ready Architecture**: Complete separation Core ↔ UI
- [x] **Chrome Integration**: DevTools Protocol connection a automation
- [x] **Event System**: Type-safe real-time communication
- [x] **Configuration Management**: Multi-source config system
- [x] **Logging System**: Winston structured logging s project context

### Phase 2: Core Business Logic ✅  
- [x] **DownloadEngine**: Main orchestration engine (GUI-independent)
- [x] **ProjectManager**: Project validation a URL building
- [x] **SessionManager**: Chrome session a connection handling
- [x] **FileManager**: File operations a download management
- [x] **ESFPortal**: Portal navigation a authentication detection
- [x] **Error Handling**: Comprehensive error types a recovery

### Phase 3: CLI Interface ✅
- [x] **Professional CLI**: Commander.js s comprehensive help
- [x] **Real-time Progress**: ASCII progress bars a status indicators  
- [x] **Argument Validation**: Project numbers, files, rate limiting
- [x] **Error Display**: Type-specific error formatting
- [x] **Graceful Shutdown**: SIGINT/SIGTERM handling
- [x] **Help System**: Examples a detailed usage instructions

### Phase 4: Chrome Automation ✅
- [x] **Browser Utils**: DOM manipulation a element detection
- [x] **Multi-strategy Downloads**: Chrome navigation + HTTP fallback
- [x] **Authentication Detection**: identita.gov.cz flow analysis
- [x] **Session Management**: Cookie handling a reconnect logic
- [x] **File Validation**: PDF integrity checking
- [x] **Retry Logic**: Exponential backoff a error recovery

### Phase 5: Analysis Tools ✅
- [x] **Network Analyzer**: Comprehensive HTTP traffic capture
- [x] **Interactive CLI**: Live recording s manual markers
- [x] **Traffic Filtering**: ESF/identita portal prioritization
- [x] **Session Capture**: Cookies, localStorage, sessionStorage
- [x] **Analysis Reports**: Structured JSON s statistics
- [x] **Testing Documentation**: Comprehensive manual testing guide

## 🔄 CURRENT PHASE: Real-World Testing

### Phase 6: Manual Analysis & Validation ⏳
- [ ] **Project 740 Analysis**: Manual workflow recording
- [ ] **Authentication Flow**: Capture identita.gov.cz ↔ esf.gov.cz
- [ ] **Portal Structure**: HTML selectors a PDF discovery
- [ ] **Download Mechanisms**: Direct links vs. POST requests
- [ ] **Session Management**: Cookie requirements a timing
- [ ] **Error Patterns**: Rate limiting a authentication failures

### Current Sprint Tasks
1. **🎯 Manual Testing** (High Priority)
   - Run network analyzer s projektem č. 740
   - Record complete login → navigation → download workflow
   - Capture all authentication cookies a session data
   - Document PDF download URLs a mechanisms

2. **🔍 Data Analysis** (High Priority)  
   - Analyze captured network traffic
   - Identify authentication requirements
   - Map ESF portal structure a selectors
   - Validate current assumptions

3. **🔧 Logic Refinement** (Medium Priority)
   - Update ESFPortal.ts based on real data
   - Enhance FileManager download strategies
   - Improve authentication detection
   - Add specific error handling

## 🎯 UPCOMING PHASES

### Phase 7: Production Implementation
- [ ] **ESF Logic Updates**: Real-world data integration
- [ ] **Automated Testing**: End-to-end s projekt 740
- [ ] **Performance Optimization**: Rate limiting a efficiency
- [ ] **Error Handling**: Edge cases a recovery strategies
- [ ] **Documentation**: Production usage guide

### Phase 8: Production Deployment
- [ ] **Performance Testing**: Large project sets
- [ ] **Reliability Testing**: Long-running sessions
- [ ] **User Documentation**: Complete usage guide
- [ ] **Error Monitoring**: Production logging a alerts
- [ ] **Release Packaging**: Distribution ready

### Phase 9: GUI Preparation (Future)
- [ ] **UI Requirements**: Based on CLI experience
- [ ] **Technology Selection**: Electron vs. Web vs. Tauri
- [ ] **Core Integration**: Event system utilization
- [ ] **Prototype Development**: Basic GUI implementation

## 📊 PROJECT METRICS

### ✅ Completed Goals
- **Architecture**: 100% GUI-ready separation
- **Core Logic**: 100% business functionality
- **CLI Interface**: 100% professional UX
- **Chrome Integration**: 100% automation ready
- **Analysis Tools**: 100% testing infrastructure

### ⏳ Current Goals  
- **Real-world Validation**: ESF portal analysis
- **Production Logic**: Data-driven refinement
- **Automated Testing**: End-to-end validation
- **Performance**: Production-ready optimization

### 🎯 Success Criteria
- [x] ✅ Robust Chrome automation
- [x] ✅ Professional CLI interface  
- [x] ✅ Comprehensive error handling
- [x] ✅ Real-time progress tracking
- [x] ✅ Network analysis capabilities
- [ ] ⏳ Successful projekt 740 downloads
- [ ] ⏳ Production reliability testing
- [ ] ⏳ Complete user documentation

## 🏗️ TECHNICAL ARCHITECTURE

### Core Components
```
src/
├── core/                    # ✅ Business Logic (GUI-independent)
│   ├── DownloadEngine.ts    # Main orchestration
│   ├── ProjectManager.ts    # Project validation & URLs
│   ├── SessionManager.ts    # Chrome session management
│   ├── FileManager.ts       # File operations & downloads
│   └── ESFPortal.ts         # Portal navigation & discovery
├── interfaces/              # ✅ UI Frontends
│   ├── cli/                 # Command line interface
│   └── gui/ (future)        # Future GUI implementations
├── analyzer/                # ✅ Testing & Analysis Tools
│   └── NetworkAnalyzer.ts   # Traffic capture & analysis
├── events/                  # ✅ Event System
├── utils/                   # ✅ Shared Utilities
└── types/                   # ✅ TypeScript Definitions
```

### Technology Stack
- **Core**: TypeScript 5.3+ s strict mode
- **Browser**: Chrome DevTools Protocol
- **CLI**: Commander.js + Winston logging
- **Events**: Custom type-safe EventEmitter
- **Build**: ES modules s .js extensions
- **Testing**: Jest + manual analysis tools

## 🔄 DEVELOPMENT WORKFLOW

### Current Sprint (Week 4)
```bash
# 1. Manual Analysis
npm run analyze
# → Interactive network traffic recording

# 2. Data Analysis  
# → Review analysis/esf_analysis_*.json files

# 3. Logic Updates
# → Update ESFPortal.ts based on findings

# 4. Automated Testing
npm run download -- --projects 740 --verbose
# → Validate automated workflow
```

### Git Workflow
- **Main branch**: Production-ready code
- **Feature commits**: Tagged s [feat-XXX], [fix-XXX], [docs-XXX]
- **Regular pushes**: Minimum 2x daily s progress
- **Release tags**: v1.0.0-beta, v1.0.0, etc.

## 🎯 NEXT MILESTONES

### Week 4 Goals (Current)
- [x] ✅ Network analyzer implementation
- [ ] ⏳ Manual projekt 740 analysis  
- [ ] ⏳ ESF portal logic refinement
- [ ] ⏳ Automated download validation

### Month 1 Goals
- [ ] Production-ready automated downloads
- [ ] Comprehensive error handling
- [ ] Performance optimization
- [ ] Complete documentation

### Future Expansion
- [ ] Multiple project types support
- [ ] GUI interface development
- [ ] Multi-user/organization features
- [ ] Cloud deployment options

## 🚨 RISK MANAGEMENT

### Technical Risks
- **ESF Portal Changes**: ✅ Mitigated by network analyzer
- **Authentication Complexity**: ⏳ Currently analyzing
- **Rate Limiting**: ✅ Configurable delays implemented
- **Chrome Stability**: ✅ Robust reconnection logic

### Business Risks  
- **Portal Access**: Manual authentication required
- **Terms of Service**: Respectful automation practices
- **Data Privacy**: No credentials storage

This plan reflects the current state where foundational work is complete and we're moving into real-world testing and validation phase.

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