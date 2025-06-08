#!/usr/bin/env node
import { ChromeTabManager } from './chrome-tabs.js';
/**
 * Debug Chrome tabs detection
 */
async function debugTabs() {
    try {
        console.log('🔍 Chrome Tabs Debug Tool');
        console.log('========================');
        const tabManager = new ChromeTabManager(9222);
        // Get raw response from Chrome
        console.log('\n📡 Fetching Chrome tabs...');
        const response = await fetch('http://localhost:9222/json');
        const rawData = await response.json();
        console.log('\n📋 Raw Chrome Response:');
        console.log(JSON.stringify(rawData, null, 2));
        console.log('\n🔍 Analyzing tabs:');
        rawData.forEach((tab, index) => {
            console.log(`\nTab ${index}:`);
            console.log(`  ID: ${tab.id}`);
            console.log(`  Title: ${tab.title}`);
            console.log(`  URL: ${tab.url}`);
            console.log(`  Type: ${tab.type}`);
            console.log(`  WebSocket: ${tab.webSocketDebuggerUrl || 'None'}`);
        });
        // Test our tab manager
        console.log('\n🧪 Testing TabManager:');
        const tabs = await tabManager.listTabs();
        console.log(`Found ${tabs.length} page tabs`);
        tabs.forEach((tab, index) => {
            console.log(`\nPage Tab ${index}:`);
            console.log(`  ID: ${tab.id}`);
            console.log(`  Title: ${tab.title}`);
            console.log(`  URL: ${tab.url}`);
        });
        // Test ESF detection
        console.log('\n🎯 Testing ESF Detection:');
        const esfTab = await tabManager.findESFTab();
        if (esfTab) {
            console.log('✅ ESF tab found:');
            console.log(`  Title: ${esfTab.title}`);
            console.log(`  URL: ${esfTab.url}`);
        }
        else {
            console.log('❌ No ESF tab found');
        }
        // Test active tab detection
        console.log('\n🎯 Testing Active Tab Detection:');
        const activeTab = await tabManager.findActiveTab();
        if (activeTab) {
            console.log('✅ Active tab found:');
            console.log(`  Title: ${activeTab.title}`);
            console.log(`  URL: ${activeTab.url}`);
        }
        else {
            console.log('❌ No active tab found');
        }
    }
    catch (error) {
        console.error('❌ Error:', error);
    }
}
// Run if called directly
if (require.main === module) {
    debugTabs().catch(console.error);
}
//# sourceMappingURL=debug-tabs.js.map