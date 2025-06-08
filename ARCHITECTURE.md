# ESF ČR Downloader - Architektura

## Přehled

Aplikace používá **GUI-ready architekturu** s důrazem na separation of concerns a budoucí rozšiřitelnost o grafické uživatelské rozhraní.

## Architektonické principy

### 1. Separation of Concerns
- **Core**: Business logika nezávislá na UI
- **Interfaces**: UI vrstvy (CLI, budoucí GUI)
- **Events**: Event-driven komunikace mezi vrstvami

### 2. Event-Driven Architecture
```typescript
Core Engine → Events → UI Layer
            ↓
    Progress, Errors, Status
```

### 3. Configuration Abstraction
- Konfigurace nezávislá na zdroji (CLI args, config file, GUI forms)
- Centralizovaný ConfigManager pro všechny UI

## Struktura adresářů

```
src/
├── core/                    # Business Logic Layer
│   ├── DownloadEngine.ts    # Hlavní stahování engine
│   ├── ProjectManager.ts    # Správa a validace projektů
│   ├── SessionManager.ts    # Chrome session management
│   └── FileManager.ts       # File operations a organization
├── interfaces/              # User Interface Layer
│   ├── cli/                 # Command Line Interface
│   │   ├── index.ts         # CLI entry point
│   │   ├── args.ts          # Argument parsing & validation
│   │   ├── progress.ts      # Progress bar a console output
│   │   └── commands.ts      # CLI command definitions
│   └── gui/                 # Future GUI Implementations
│       ├── electron/        # Desktop App (Electron)
│       │   ├── main.ts      # Electron main process
│       │   ├── renderer/    # UI components
│       │   └── preload.ts   # Secure IPC
│       └── web/             # Web Interface
│           ├── server.ts    # Express server
│           ├── routes/      # API endpoints
│           └── client/      # React frontend
├── events/                  # Event System
│   ├── EventEmitter.ts      # Custom event emitter
│   ├── types.ts             # Event type definitions
│   └── handlers/            # Event handler utilities
├── config/                  # Configuration Management
│   ├── ConfigManager.ts     # Configuration abstraction
│   ├── defaults.ts          # Default configuration values
│   ├── validators.ts        # Config validation
│   └── types.ts             # Config type definitions
└── utils/                   # Shared Utilities
    ├── logger.ts            # Logging utility (Winston)
    ├── chrome.ts            # Chrome connection utilities
    ├── validation.ts        # Common validation functions
    └── helpers.ts           # General helper functions
```

## Core Layer - Business Logic

### DownloadEngine
```typescript
class DownloadEngine extends EventEmitter {
  async downloadProjects(projects: ProjectConfig[]): Promise<DownloadResult[]>
  async downloadProject(project: string): Promise<DownloadResult>
  
  // Events: 'progress', 'error', 'complete', 'project-start', 'project-complete'
}
```

### ProjectManager
```typescript
class ProjectManager {
  validateProjectNumber(input: string): ValidationResult
  normalizeProjectNumber(input: string): string
  buildProjectUrl(projectNumber: string): string
  parseProjectsFromFile(filePath: string): string[]
}
```

### SessionManager
```typescript
class SessionManager extends EventEmitter {
  async connect(): Promise<void>
  async authenticate(): Promise<boolean>
  isAuthenticated(): boolean
  
  // Events: 'connected', 'disconnected', 'auth-required', 'session-expired'
}
```

### FileManager
```typescript
class FileManager {
  async createProjectDirectory(projectNumber: string): Promise<string>
  async downloadFile(url: string, destination: string): Promise<void>
  async saveMetadata(projectNumber: string, metadata: ProjectMetadata): Promise<void>
  validateFile(filePath: string): Promise<boolean>
}
```

## Interface Layer - User Interfaces

### CLI Interface
```typescript
class CLIApp {
  constructor(private engine: DownloadEngine) {
    this.setupEventHandlers();
  }
  
  async run(args: CLIArgs): Promise<void>
  private setupEventHandlers(): void
  private showProgress(event: ProgressEvent): void
  private handleError(error: ErrorEvent): void
}
```

### Future GUI Interfaces

#### Electron Desktop App
```typescript
class ElectronApp {
  constructor(private engine: DownloadEngine) {}
  
  async initialize(): Promise<void>
  private setupIPC(): void
  private createWindow(): void
}
```

#### Web Interface
```typescript
class WebApp {
  constructor(private engine: DownloadEngine) {}
  
  setupRoutes(): void
  setupWebSocket(): void  // Real-time progress updates
}
```

## Event System

### Event Types
```typescript
interface ProgressEvent {
  type: 'project-start' | 'download-progress' | 'project-complete';
  projectNumber: string;
  progress?: {
    current: number;
    total: number;
    percentage: number;
  };
  data?: any;
}

interface ErrorEvent {
  type: 'validation-error' | 'network-error' | 'auth-error' | 'file-error';
  message: string;
  projectNumber?: string;
  error?: Error;
}

interface StatusEvent {
  type: 'session-status' | 'engine-status';
  status: 'connected' | 'disconnected' | 'idle' | 'working';
  data?: any;
}
```

### Event Flow
```
Core Engine Events → Event Dispatcher → UI Subscribers

DownloadEngine.downloadProject()
├── emit('project-start', { projectNumber })
├── emit('download-progress', { current, total })
├── emit('project-complete', { projectNumber, result })
└── emit('error', { type, message, projectNumber })

CLI subscribes → Console output, Progress bars
GUI subscribes → UI updates, Progress bars, Notifications
```

## Configuration Management

### ConfigManager
```typescript
class ConfigManager {
  static fromCLI(args: CLIArgs): AppConfig
  static fromFile(filePath: string): AppConfig
  static fromGUI(settings: GUISettings): AppConfig
  static merge(...configs: Partial<AppConfig>[]): AppConfig
  
  validate(config: AppConfig): ValidationResult
  getDefaults(): AppConfig
}
```

### Configuration Sources
1. **Default values** (defaults.ts)
2. **Environment variables**
3. **Config file** (.esf-downloader.json)
4. **CLI arguments** (highest priority)
5. **GUI settings** (future)

### Config Schema
```typescript
interface AppConfig {
  // Project settings
  projects: string[];
  inputFile?: string;
  
  // Output settings
  outputDir: string;
  createProjectDirs: boolean;
  
  // Network settings
  rateLimit: number;
  retryAttempts: number;
  timeout: number;
  
  // Chrome settings
  chromePort: number;
  chromePath?: string;
  
  // Logging settings
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  logToFile: boolean;
  
  // UI settings
  verbose: boolean;
  dryRun: boolean;
}
```

## Data Flow

### CLI Workflow
```
1. CLI Args Parsing → ConfigManager.fromCLI()
2. Config Validation → ConfigManager.validate()
3. DownloadEngine Creation → new DownloadEngine(config)
4. Event Subscription → engine.on('progress', handleProgress)
5. Execution → engine.downloadProjects(projects)
6. Real-time Updates → Event handlers update CLI display
7. Completion → Final report and exit codes
```

### Future GUI Workflow
```
1. GUI Settings → ConfigManager.fromGUI()
2. Engine Creation → Same as CLI
3. Event Subscription → UI component updates
4. User Interaction → Start/Stop/Pause via GUI
5. Real-time Updates → Progress bars, file lists, status
6. Completion → Notifications, results display
```

## Testing Strategy

### Unit Testing
- **Core classes**: Mock dependencies, test business logic
- **Event system**: Test event emission and handling
- **Configuration**: Test validation and merging
- **File operations**: Test with temporary directories

### Integration Testing
- **Chrome connection**: Test with real Chrome instance
- **End-to-end**: CLI with real ESF portal (staging)
- **GUI integration**: Test UI ↔ Core communication

### Mock Testing
- **ESF API responses**: Mock network responses
- **File system**: Mock file operations
- **Chrome automation**: Mock Chrome DevTools Protocol

## Future Extensions

### Additional UI Technologies
- **Tauri**: Rust-based lightweight desktop app
- **Progressive Web App**: Installable web app
- **Mobile app**: React Native with core logic sharing
- **VS Code Extension**: Direct integration

### Core Extensions
- **Batch processing**: Multiple ESF portals
- **Scheduling**: Automated periodic downloads
- **Database integration**: Progress tracking, history
- **Cloud storage**: Direct upload to cloud services

## Security Considerations

### Session Management
- **No credential storage**: Only session cookies in memory
- **Session timeout**: Automatic cleanup
- **Secure IPC**: Electron preload scripts for security

### File Security
- **Path validation**: Prevent directory traversal
- **File type validation**: Only expected file types
- **Checksum verification**: Integrity checks

### Network Security
- **Rate limiting**: Respect server limits
- **Error handling**: No sensitive data in logs
- **SSL/TLS**: Secure connections only

## Performance Considerations

### Memory Management
- **Stream processing**: Large files via streams
- **Event cleanup**: Proper event listener cleanup
- **Chrome memory**: Monitor and restart if needed

### Concurrency
- **Parallel downloads**: Configurable concurrency limit
- **Rate limiting**: Per-server request throttling
- **Progress batching**: Efficient UI updates

### Caching
- **Session caching**: Reuse authenticated sessions
- **File verification**: Skip existing valid files
- **Metadata caching**: Project information caching