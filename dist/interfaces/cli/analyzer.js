#!/usr/bin/env node
import { SessionManager } from '../../core/SessionManager.js';
import { NetworkAnalyzer } from '../../analyzer/NetworkAnalyzer.js';
import { testChromeConnection } from '../../utils/chrome.js';
import { CHROME_CONFIG } from '../../config/defaults.js';
/**
 * ESF Portal Analyzer CLI
 * Interactive tool for recording manual workflow through ESF portal
 */
class ESFAnalyzer {
    sessionManager;
    analyzer = null;
    projectNumber = null;
    constructor() {
        this.sessionManager = new SessionManager(CHROME_CONFIG.DEFAULT_PORT);
    }
    /**
     * Main analyzer entry point
     */
    async run() {
        try {
            console.log('🔍 ESF Portal Network Analyzer');
            console.log('=====================================');
            // Check Chrome connection
            console.log('📡 Checking Chrome connection...');
            const isConnected = await testChromeConnection();
            if (!isConnected) {
                console.error('❌ Chrome is not running in debug mode.');
                console.error('Please start Chrome with:');
                console.error(`google-chrome --remote-debugging-port=${CHROME_CONFIG.DEFAULT_PORT} --disable-web-security --user-data-dir=/tmp/chrome-debug`);
                process.exit(1);
            }
            console.log('✅ Chrome connection successful');
            // Connect to Chrome session
            console.log('🔗 Connecting to Chrome session...');
            await this.sessionManager.connect();
            // Initialize analyzer
            this.analyzer = new NetworkAnalyzer(this.sessionManager.getClient(), './analysis');
            console.log('✅ Analyzer initialized');
            console.log('');
            // Show interactive menu
            await this.showInteractiveMenu();
        }
        catch (error) {
            console.error('❌ Analyzer failed:', error.message);
            process.exit(1);
        }
    }
    /**
     * Show interactive command menu
     */
    async showInteractiveMenu() {
        console.log('📋 Available Commands:');
        console.log('  start [project]  - Start recording (optionally specify project number)');
        console.log('  stop             - Stop recording and save data');
        console.log('  marker <text>    - Add manual marker to recording');
        console.log('  status           - Show current recording status');
        console.log('  help             - Show this help');
        console.log('  exit             - Exit analyzer');
        console.log('');
        console.log('💡 Recommended workflow for project 740:');
        console.log('  1. start 740');
        console.log('  2. Navigate to ESF portal and login via identita.gov.cz');
        console.log('  3. marker "logged-in"');
        console.log('  4. Navigate to project 740 page');
        console.log('  5. marker "project-page-loaded"');
        console.log('  6. Find and click on participant cards/downloads');
        console.log('  7. marker "found-download-links"');
        console.log('  8. Download a PDF file');
        console.log('  9. marker "pdf-downloaded"');
        console.log('  10. stop');
        console.log('');
        // Setup readline for interactive commands
        const readline = await import('readline');
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: 'analyzer> '
        });
        rl.prompt();
        rl.on('line', async (input) => {
            const trimmed = input.trim();
            if (!trimmed) {
                rl.prompt();
                return;
            }
            try {
                const [command, ...args] = trimmed.split(' ');
                await this.handleCommand(command.toLowerCase(), args);
            }
            catch (error) {
                console.error('❌ Command error:', error.message);
            }
            rl.prompt();
        });
        rl.on('close', async () => {
            console.log('\n👋 Analyzer exiting...');
            await this.cleanup();
            process.exit(0);
        });
        // Handle Ctrl+C gracefully
        process.on('SIGINT', async () => {
            console.log('\n🛑 Shutting down analyzer...');
            await this.cleanup();
            process.exit(0);
        });
    }
    /**
     * Handle interactive commands
     */
    async handleCommand(command, args) {
        switch (command) {
            case 'start':
                await this.startRecording(args[0]);
                break;
            case 'stop':
                await this.stopRecording();
                break;
            case 'marker':
                await this.addMarker(args.join(' '));
                break;
            case 'status':
                this.showStatus();
                break;
            case 'help':
                this.showHelp();
                break;
            case 'exit':
            case 'quit':
                await this.cleanup();
                process.exit(0);
                break;
            default:
                console.log(`❓ Unknown command: ${command}. Type 'help' for available commands.`);
        }
    }
    /**
     * Start recording network traffic
     */
    async startRecording(projectNumber) {
        if (!this.analyzer) {
            console.log('❌ Analyzer not initialized');
            return;
        }
        if (this.analyzer.isCurrentlyRecording()) {
            console.log('⚠️  Recording is already active. Use "stop" first.');
            return;
        }
        this.projectNumber = projectNumber || null;
        await this.analyzer.startRecording(this.projectNumber || undefined);
        console.log('🎬 Recording started!');
        if (this.projectNumber) {
            console.log(`📊 Project: ${this.projectNumber}`);
        }
        console.log('🌐 Navigate to ESF portal and perform your workflow...');
        console.log('💡 Use "marker <description>" to mark important steps');
    }
    /**
     * Stop recording and save data
     */
    async stopRecording() {
        if (!this.analyzer) {
            console.log('❌ Analyzer not initialized');
            return;
        }
        if (!this.analyzer.isCurrentlyRecording()) {
            console.log('⚠️  No recording is active');
            return;
        }
        console.log('🛑 Stopping recording...');
        const filename = await this.analyzer.stopRecording();
        console.log('✅ Recording stopped!');
        console.log(`📄 Analysis saved: ${filename}`);
        console.log('');
        // Show summary
        const session = this.analyzer.getCurrentSession();
        console.log('📊 Session Summary:');
        console.log(`   Duration: ${((session.endTime - session.startTime) / 1000).toFixed(1)}s`);
        console.log(`   Requests: ${session.requests.length}`);
        console.log(`   Responses: ${session.responses.length}`);
        console.log(`   Page Events: ${session.pageEvents.length}`);
        const pdfRequests = session.requests.filter(r => r.url.includes('.pdf') || r.headers['accept']?.includes('application/pdf'));
        console.log(`   PDF Requests: ${pdfRequests.length}`);
        const domains = [...new Set(session.requests.map(r => {
                try {
                    return new URL(r.url).hostname;
                }
                catch {
                    return 'unknown';
                }
            }))];
        console.log(`   Unique Domains: ${domains.length}`);
        console.log('');
    }
    /**
     * Add manual marker
     */
    async addMarker(description) {
        if (!this.analyzer) {
            console.log('❌ Analyzer not initialized');
            return;
        }
        if (!this.analyzer.isCurrentlyRecording()) {
            console.log('⚠️  No recording is active. Use "start" first.');
            return;
        }
        if (!description) {
            console.log('⚠️  Please provide a marker description');
            return;
        }
        await this.analyzer.addMarker(description);
        console.log(`📍 Marker added: ${description}`);
    }
    /**
     * Show current status
     */
    showStatus() {
        if (!this.analyzer) {
            console.log('❌ Analyzer not initialized');
            return;
        }
        const isRecording = this.analyzer.isCurrentlyRecording();
        console.log(`📊 Status: ${isRecording ? '🔴 Recording' : '⚪ Idle'}`);
        if (isRecording) {
            const session = this.analyzer.getCurrentSession();
            const duration = (Date.now() - session.startTime) / 1000;
            console.log(`   Duration: ${duration.toFixed(1)}s`);
            console.log(`   Requests: ${session.requests.length}`);
            console.log(`   Page Events: ${session.pageEvents.length}`);
            if (this.projectNumber) {
                console.log(`   Project: ${this.projectNumber}`);
            }
        }
    }
    /**
     * Show help
     */
    showHelp() {
        console.log('');
        console.log('🔍 ESF Portal Network Analyzer');
        console.log('===============================');
        console.log('');
        console.log('This tool records network traffic and page events while you manually');
        console.log('navigate through the ESF portal. Use this data to understand the');
        console.log('authentication flow and PDF download process.');
        console.log('');
        console.log('📋 Commands:');
        console.log('  start [project]  - Start recording network traffic');
        console.log('  stop             - Stop recording and save analysis data');
        console.log('  marker <text>    - Add a manual marker with description');
        console.log('  status           - Show current recording status');
        console.log('  help             - Show this help message');
        console.log('  exit             - Exit the analyzer');
        console.log('');
        console.log('💡 Workflow Tips:');
        console.log('  • Start Chrome with debug port before running analyzer');
        console.log('  • Use markers to identify important steps in your workflow');
        console.log('  • Navigate slowly to capture all network activity');
        console.log('  • Download at least one PDF to capture the download flow');
        console.log('');
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            if (this.analyzer?.isCurrentlyRecording()) {
                console.log('💾 Saving recording before exit...');
                await this.analyzer.stopRecording();
            }
            await this.sessionManager.cleanup();
        }
        catch (error) {
            console.error('⚠️  Cleanup error:', error.message);
        }
    }
}
/**
 * Run analyzer if this module is executed directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
    const analyzer = new ESFAnalyzer();
    analyzer.run().catch((error) => {
        console.error('💥 Fatal error:', error.message);
        process.exit(1);
    });
}
export { ESFAnalyzer };
//# sourceMappingURL=analyzer.js.map