# ESF Downloader - Technical Context & Implementation Details

**Datum**: 2025-06-08  
**Status**: Ready for Real-World Testing  
**Fáze**: Network Analysis & Portal Validation

## 🏗️ Architektura - Detailní implementace

### GUI-Ready Design Pattern
Aplikace používá **separation of concerns** pattern s kompletní separací business logic od UI:

```typescript
// Core Business Logic (GUI-independent)
src/core/
├── DownloadEngine.ts     # Main orchestrator, emits events
├── ProjectManager.ts     # Project validation & URL building  
├── SessionManager.ts     # Chrome session management
├── FileManager.ts        # File operations & downloads
└── ESFPortal.ts         # Portal navigation & discovery

// UI Interfaces (subscribes to core events)
src/interfaces/
├── cli/                 # Command line interface
└── gui/ (future)        # Future GUI implementations

// Event-driven communication
src/events/
└── EventEmitter.ts      # Type-safe events mezi Core ↔ UI
```

### Event System
**Type-safe real-time communication** mezi core a UI vrstvou:
```typescript
// Core emits events
this.emitProgress(projectNumber, current, total);
this.emitError({ type: 'auth-error', message: '...' });
this.emitStatus('working');

// UI subscribes to events  
downloadEngine.onProgress((event) => progressDisplay.update(event));
downloadEngine.onError((event) => errorDisplay.show(event));
```

## 🔧 Core Components - Implementation Details

### DownloadEngine.ts
**Main orchestration engine** - coordinates all business logic:
```typescript
class DownloadEngine extends ESFEventEmitter {
  // Koordinuje ProjectManager, SessionManager, FileManager, ESFPortal
  async downloadProjects(projectNumbers: string[]): Promise<DownloadResult[]>
  async downloadProject(projectNumber: string): Promise<DownloadResult>
  
  // Event emissions pro real-time UI updates
  emitProjectStart(projectNumber: string)
  emitDownloadProgress(projectNumber: string, current: number, total: number)
  emitProjectComplete(projectNumber: string, data: any)
}
```

### SessionManager.ts
**Chrome session handling** s robust connection management:
```typescript
class SessionManager extends ESFEventEmitter {
  // CDP connection management
  async connect(): Promise<void>
  async disconnect(): Promise<void>
  getClient(): CDPClient
  
  // Authentication detection
  isAuthenticated(): boolean
  setAuthenticationStatus(authenticated: boolean): void
  
  // Robust reconnection logic
  private async scheduleReconnect(): Promise<void>
  private handleConnectionError(error: Error): void
}
```

### ESFPortal.ts
**Portal navigation & automation** s intelligent discovery:
```typescript
class ESFPortal {
  // Navigation s authentication checks
  async navigateToProject(projectNumber: string): Promise<ESFProjectUrl>
  async checkAuthentication(): Promise<boolean>
  
  // PDF discovery s multiple strategies
  async discoverPDFCards(projectNumber: string): Promise<ESFCardInfo[]>
  private async extractFromTable(): Promise<ESFCardInfo[]>
  private async extractFromContainers(): Promise<ESFCardInfo[]>
}
```

### FileManager.ts
**Advanced file operations** s Chrome integration:
```typescript
class FileManager {
  // Chrome-integrated downloads s fallback
  async downloadPDFCard(card: ESFCardInfo, projectNumber: string, client: CDPClient): Promise<FileInfo>
  async downloadPDFCards(cards: ESFCardInfo[], projectNumber: string, client: CDPClient): Promise<{successful: FileInfo[], failed: any[]}>
  
  // Multi-strategy downloads
  private async downloadWithChrome(url: string, destination: string, client: CDPClient): Promise<FileInfo>
  private async downloadViaNavigation(url: string, destination: string, client: CDPClient): Promise<FileInfo>
  
  // File validation & retry logic
  async validateFile(filePath: string): Promise<boolean>
  private sanitizeFilename(filename: string): string
}
```

## 🌐 Chrome Integration - Technical Details

### Chrome DevTools Protocol (CDP)
**Direct browser automation** bez Puppeteer overhead:
```typescript
// Přímé CDP commands
await client.send('Page.navigate', { url });
await client.send('Network.enable');
await client.send('Page.setDownloadBehavior', { behavior: 'allow' });

// Event handling
client.on('Network.responseReceived', (params) => {
  // Handle network responses pro authentication detection
});
```

### Multi-Strategy Downloads
**Robust download handling** s fallback mechanisms:
1. **Chrome Navigation**: Pro authenticated downloads s session cookies
2. **HTTP Fetch**: Fallback pro direct links
3. **Retry Logic**: Exponential backoff při failures
4. **File Validation**: PDF header checking pro integrity

### Authentication Detection
**Smart detection** identita.gov.cz ↔ esf.gov.cz flow:
```typescript
async checkAuthentication(): Promise<boolean> {
  const currentUrl = await this.chromeUtils.getCurrentUrl();
  
  // Identity portal redirect = not authenticated
  if (currentUrl.includes('identita.gov.cz')) return false;
  
  // ESF portal access = authenticated
  if (currentUrl.includes('esf.gov.cz') && !currentUrl.includes('login')) return true;
}
```

## 📊 Network Analyzer - Analysis Capabilities

### Comprehensive Traffic Capture
**Real-time network monitoring** s intelligent filtering:
```typescript
interface AnalysisSession {
  requests: NetworkRequest[];     // All HTTP requests s headers & payloads
  responses: NetworkResponse[];   // All responses s status & body capture
  pageEvents: PageEvent[];        // Navigation & manual markers
  cookies: any[];                 // Authentication cookies
  localStorage: Record<string, string>;
  sessionStorage: Record<string, string>;
}
```

### Smart Traffic Filtering
**Prioritized capture** důležitých requests:
- ESF portal requests (`esf.gov.cz`)
- Identity portal requests (`identita.gov.cz`)  
- PDF downloads (`.pdf`, `application/pdf`)
- API calls (`/api/`, `/rest/`)
- Authentication requests (`login`, `auth`, `oauth`)

### Analysis Features
- **Response Body Capture**: JSON/HTML z ESF/identita portálů
- **Error Detection**: 4xx/5xx responses pro debugging
- **Timeline Markers**: Manual annotations pro workflow steps
- **Statistics Generation**: Request counts, domains, timing

## 🖥️ CLI Interface - Professional UX

### Commander.js Integration
**Enterprise-grade CLI** s comprehensive features:
```bash
esf-downloader [options]

Options:
  -p, --projects <numbers>  Comma-separated project numbers
  -f, --file <path>         File containing project numbers  
  -o, --output <directory>  Output directory
  -v, --verbose             Enable verbose logging
  -r, --rate-limit <ms>     Rate limit between requests
  --retry <count>           Retry attempts for failures
  --dry-run                 Simulate without downloading
```

### Real-time Progress Display
**Professional progress tracking** s ASCII visuals:
```
🚀 ESF Downloader starting...
📁 Output directory: ./downloads
📊 Projects to process: 3
⏱️  Rate limit: 1000ms
🔄 Retry attempts: 3
────────────────────────────────────────────

📂 Starting project 0000740 (1/3)
   📥 Downloading: [████████████████████] 15/15 (100%)
   ✅ Project 0000740 completed in 45s
   📊 Files downloaded: 15
```

### Error Handling & Display
**Type-specific error formatting** s helpful messages:
```
🔐 Authentication Error: User authentication required
   Please login manually to identita.gov.cz

🌐 Network Error: Failed to connect to Chrome
   Please start Chrome with debug mode:
   google-chrome --remote-debugging-port=9222
```

## 📝 TypeScript Implementation

### Strict Type Safety
**Complete type coverage** s strict mode:
```typescript
// Comprehensive error types
export class AuthError extends ESFError {
  constructor(message: string) {
    super(message, 'auth-error');
  }
}

// Type-safe event system
interface ProgressEvent {
  type: 'project-start' | 'download-progress' | 'project-complete';
  projectNumber: string;
  progress?: { current: number; total: number; percentage: number };
}

// CDP client interface
interface CDPClient {
  send(method: string, params?: any): Promise<any>;
  on(event: string, listener: (...args: any[]) => void): void;
  close(): Promise<void>;
}
```

### ES Modules Configuration
**Modern JavaScript modules** s .js extensions:
```json
{
  "type": "module",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext", 
    "strict": true
  }
}
```

## 🔍 Testing Infrastructure

### Network Analyzer Testing
**Interactive manual testing** tool:
```bash
npm run analyze

analyzer> start 740
analyzer> marker "logged-in"
analyzer> marker "project-page-loaded"  
analyzer> marker "found-download-links"
analyzer> marker "pdf-downloaded"
analyzer> stop
```

### Analysis Output Format
**Structured JSON reports** s detailed data:
```json
{
  "session": {
    "startTime": 1733123456789,
    "endTime": 1733123567890,
    "projectNumber": "740",
    "requests": [...],
    "responses": [...], 
    "pageEvents": [...]
  },
  "statistics": {
    "duration": 111101,
    "totalRequests": 45,
    "pdfRequests": 3,
    "uniqueDomains": ["esf.gov.cz", "identita.gov.cz"],
    "authenticationEvents": 5
  }
}
```

## 🚀 Production Readiness Features

### Configuration Management
**Multi-source configuration** system:
- CLI arguments (highest priority)
- Environment variables
- Configuration files
- Default values (lowest priority)

### Logging System
**Winston structured logging** s project context:
```typescript
logger.info('Starting download process', projectNumber, { 
  projects: projectNumbers,
  outputDir,
  rateLimit 
});

logger.downloadProgress(current, total, fileName);
logger.projectComplete(downloadedCount, totalCount);
```

### Error Recovery
**Robust error handling** s recovery strategies:
- Connection retry s exponential backoff
- File download retry s validation
- Session reconnection pro Chrome disconnects
- Graceful degradation při partial failures

### Rate Limiting & Performance
**Respectful automation** s configurable limits:
- Configurable delays mezi requests (default 1s)
- Exponential backoff pro retry logic
- Chrome session pooling pro efficiency
- Memory-efficient stream processing

## 🔮 Future Expansion Points

### GUI Integration Ready
**Event-driven architecture** připravená pro GUI:
```typescript
// CLI implementation
downloadEngine.onProgress(event => cliProgressDisplay.update(event));

// Future GUI implementation  
downloadEngine.onProgress(event => guiProgressBar.update(event));
downloadEngine.onError(event => guiErrorDialog.show(event));
```

### Extensibility Points
**Modular design** pro future features:
- Multiple portal support (extend ESFPortal interface)
- Different authentication methods (extend SessionManager)
- Additional file formats (extend FileManager)
- Custom UI implementations (extend interfaces/)

### Performance Scaling
**Architecture ready** pro large-scale usage:
- Concurrent project processing
- Distributed session management  
- Cloud deployment readiness
- Database integration points

## 🎯 Optimized ESF Portal Workflow (Validated)

### Complete Download Workflow Steps
Based on successful testing with project 2799:

1. **Navigate to Project Page**
   ```
   https://esf.gov.cz/zpravy-o-realizaci/cz-02-02-xx-00-24_034/0002799/ucastnici
   ```

2. **Wait for Participants Table** (1-2 seconds)
   - Table selector: `table.table.table-striped.table-hover.table-bordered`

3. **Extract Participant Links**
   ```javascript
   // Links in format: /zpravy-o-realizaci/cz-02-02-xx-00-24_034/0002799/ucastnici/325123
   const participantLinks = document.querySelectorAll('table tbody tr td:first-child a');
   ```

4. **For Each Participant - Optimized Flow**:
   
   a) **Navigate Directly to Participant URL** (no back button needed!)
      ```
      https://esf.gov.cz/zpravy-o-realizaci/cz-02-02-xx-00-24_034/0002799/ucastnici/325123
      ```
   
   b) **Wait and Check Checkbox** (critical step!)
      ```javascript
      const checkbox = document.querySelector('input#zobrazitUcastnika');
      if (checkbox && !checkbox.checked) {
        checkbox.click();
        await wait(1000); // Wait for tabs to appear
      }
      ```
   
   c) **Click "Jednotky na účastníkovi" Tab**
      ```javascript
      const tab = document.querySelector('a[href*="jednotkyNaUcastnikovi"]');
      tab.click();
      await wait(1000); // Wait for content to load
      ```
   
   d) **Extract PDF Links from Table**
      ```javascript
      const pdfLinks = document.querySelectorAll('table#jednotkyNaUcastnikovi tbody tr td:last-child a[href*=".pdf"]');
      // Links like: /api/file/655c7d90e2c6a1e3c49b6e5f/KU_325123_OPJAK_24_034-0002799.pdf
      ```
   
   e) **Download Each PDF**
      - Use Chrome navigation to handle authenticated downloads
      - Full URL: `https://esf.gov.cz/api/file/655c7d90e2c6a1e3c49b6e5f/KU_325123_OPJAK_24_034-0002799.pdf`

5. **Repeat for All Participants**
   - No need to go back, just navigate to next participant URL directly

### Key Implementation Details

#### Selectors Discovered
```typescript
const SELECTORS = {
  participantsTable: 'table.table.table-striped.table-hover.table-bordered',
  participantLink: 'table tbody tr td:first-child a',
  showParticipantCheckbox: 'input#zobrazitUcastnika',
  jednotkyTab: 'a[href*="jednotkyNaUcastnikovi"]',
  pdfTable: 'table#jednotkyNaUcastnikovi',
  pdfLink: 'table#jednotkyNaUcastnikovi tbody tr td:last-child a[href*=".pdf"]'
};
```

#### Timing Optimizations
```typescript
const DELAYS = {
  afterNavigation: 2000,      // Wait for page load
  afterCheckboxClick: 1000,   // Wait for tabs to appear
  afterTabClick: 1000,        // Wait for table content
  betweenDownloads: 1000,     // Rate limiting
  betweenParticipants: 2000   // Clean navigation
};
```

#### Error Handling Considerations
- Check if checkbox exists (might already be checked)
- Verify tab appears after checkbox click
- Handle empty PDF tables (no units for participant)
- Validate PDF download completion

### Production Optimization
1. **Performance profiling** s large project sets
2. **Memory usage optimization** pro long-running sessions
3. **Error monitoring** s production telemetry
4. **Reliability testing** s network interruptions

This technical context provides the foundation for understanding the current implementation and planning future development work.