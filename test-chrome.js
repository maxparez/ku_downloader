import CDP from 'chrome-remote-interface';

async function testChrome() {
    let client;
    try {
        // Connect to Chrome
        client = await CDP();
        
        // Extract domains
        const {Network, Page, Runtime} = client;
        
        // Enable necessary domains
        await Network.enable();
        await Page.enable();
        await Runtime.enable();
        
        // Navigate to a page
        await Page.navigate({url: 'https://www.google.com'});
        
        // Wait for page to load
        await Page.loadEventFired();
        
        // Get page title
        const result = await Runtime.evaluate({
            expression: 'document.title'
        });
        
        console.log('Page title:', result.result.value);
        console.log('Chrome is working correctly in debug mode!');
        
    } catch (err) {
        console.error('Error:', err);
    } finally {
        if (client) {
            await client.close();
        }
    }
}

testChrome();