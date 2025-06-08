import CDP from 'chrome-remote-interface';

async function goBackToProject() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Check current URL
    const urlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 Current URL:', urlResult.result.value);
    
    // Go back to project detail page
    console.log('\n=== GOING BACK TO PROJECT DETAIL ===');
    const backResult = await client.Runtime.evaluate({
      expression: 'window.history.back(); true;',
      returnByValue: true
    });
    
    console.log('⬅️ Going back...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check new URL
    const newUrlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 New URL:', newUrlResult.result.value);
    
    const titleResult = await client.Runtime.evaluate({
      expression: 'document.title',
      returnByValue: true
    });
    console.log('📄 Page title:', titleResult.result.value);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

goBackToProject();