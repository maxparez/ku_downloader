# Manual Testing Guide - Projekt 2799

**Test Date**: 2025-06-08  
**Project Number**: 2799  
**Normalized**: 0002799  
**Expected ESF URL**: CZ.02.02.XX/00/24_034/0002799  

## Pre-Testing Setup

### 1. Chrome Setup
```bash
# Windows - start Chrome with debugging
start-chrome.bat

# WSL - verify connection
node test-chrome.js
```

### 2. Start Network Analyzer
```bash
npm run analyze
```

## Manual Testing Workflow

### Phase 1: Initial Setup
```
analyzer> start 2799
# This starts recording all network traffic
```

### Phase 2: Authentication Flow
1. **Navigate to ESF Portal**
   - Go to: https://www.esfcr.cz/web/esf/login
   
2. **Login via identita.gov.cz**
   - Click login button
   - Complete identita.gov.cz authentication
   - Wait for redirect back to ESF portal
   
3. **Mark successful login**
   ```
   analyzer> marker "logged-in-successfully"
   ```

### Phase 3: Project Navigation
1. **Navigate to Projects Section**
   - Look for "Projekty" or similar navigation
   - Navigate to project listing/search
   
2. **Search for Project 2799**
   - Enter project number: 2799
   - Or browse to find project
   
3. **Mark project page access**
   ```
   analyzer> marker "project-2799-page-loaded"
   ```

### Phase 4: Participant Cards Discovery
1. **Look for Participant Section**
   - Find "Účastníci" or "Karty účastníků"
   - Look for download links or buttons
   
2. **Document card structure**
   ```
   analyzer> marker "found-participant-cards-section"
   ```
   
3. **Identify download mechanisms**
   - Direct PDF links
   - POST requests
   - Ajax calls
   
   ```
   analyzer> marker "identified-download-mechanism"
   ```

### Phase 5: PDF Download Testing
1. **Download first PDF**
   - Click on first participant card/download link
   - Monitor network traffic
   
   ```
   analyzer> marker "downloading-first-pdf"
   ```
   
2. **Verify download**
   - Check if PDF downloaded successfully
   - Note file name format
   - Verify file integrity
   
   ```
   analyzer> marker "first-pdf-downloaded"
   ```

3. **Download additional PDFs** (if available)
   ```
   analyzer> marker "downloading-additional-pdfs"
   ```

### Phase 6: Complete Analysis
1. **Stop recording**
   ```
   analyzer> stop
   ```

2. **Review captured data**
   - Check generated analysis file
   - Look for patterns in requests/responses

## Expected Data Points

### Authentication Flow
- [ ] Login redirect URLs
- [ ] Authentication cookies
- [ ] Session tokens
- [ ] ESF portal access confirmation

### Project Access
- [ ] Project URL structure: `/projekt/2799` or similar
- [ ] Project page HTML structure
- [ ] Navigation patterns

### PDF Downloads
- [ ] Direct PDF URLs vs. generated links
- [ ] Required headers/cookies
- [ ] File naming conventions
- [ ] Download mechanisms (GET vs. POST)

### Network Patterns
- [ ] ESF portal domain structure
- [ ] API endpoints (if any)
- [ ] Rate limiting behavior
- [ ] Error responses

## Troubleshooting

### Common Issues
1. **Chrome connection failed**
   ```bash
   # Restart Chrome with debugging
   taskkill /F /IM chrome.exe
   start-chrome.bat
   ```

2. **Authentication timeout**
   - Use longer session for login
   - Try different browser tab

3. **Project not found**
   - Verify project number 2799 exists
   - Check access permissions

### Recovery Commands
```bash
# Reset analyzer if stuck
npm run analyze

# Check Chrome connection
node test-chrome.js

# View logs
tail -f logs/esf-downloader.log
```

## Analysis Output

The analyzer will create a file: `analysis/esf_analysis_2025-XX-XX_projekt_2799.json`

This will contain:
- All HTTP requests/responses
- Manual workflow markers
- Authentication cookies
- Session storage data
- Timeline of events

## Next Steps

After completing manual analysis:
1. Review captured data in analysis file
2. Update ESFPortal.ts with real selectors
3. Enhance authentication flow logic
4. Test automated download with: `npm run download -- --projects 2799`

## Success Criteria

- [ ] Successful authentication flow captured
- [ ] Project 2799 page accessed and analyzed
- [ ] At least one PDF download captured
- [ ] Complete network traffic recorded
- [ ] Analysis file generated with useful data