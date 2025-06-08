import CDP from 'chrome-remote-interface';

async function simpleClickTest() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Simple approach - find any link with 2799 and click it
    console.log('\n=== SIMPLE CLICK TEST ===');
    const clickResult = await client.Runtime.evaluate({
      expression: `
        let found = false;
        const links = document.querySelectorAll('a');
        
        for (let link of links) {
          const text = link.textContent || '';
          const href = link.href || '';
          
          if (text.includes('2799') && href.includes('ProjektDetailPage')) {
            console.log('Clicking link:', text.trim(), href);
            link.click();
            found = true;
            break;
          }
        }
        
        found;
      `,
      returnByValue: true
    });
    
    console.log('🖱️ Click result:', clickResult.result.value);
    
    if (clickResult.result.value) {
      console.log('⏳ Waiting 5 seconds for page load...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Check where we are now
      const urlResult = await client.Runtime.evaluate({
        expression: 'window.location.href',
        returnByValue: true
      });
      console.log('📍 Current URL:', urlResult.result.value);
      
      const titleResult = await client.Runtime.evaluate({
        expression: 'document.title',
        returnByValue: true
      });
      console.log('📄 Current title:', titleResult.result.value);
      
      // Look for "Seznam podpořených osob" on this page
      const supportResult = await client.Runtime.evaluate({
        expression: `
          const links = document.querySelectorAll('a');
          const supportLinks = [];
          
          for (let link of links) {
            const text = link.textContent || '';
            if (text.includes('Seznam podpořených') || text.includes('podpor')) {
              supportLinks.push({
                text: text.trim().substring(0, 50),
                href: link.href
              });
            }
          }
          
          supportLinks;
        `,
        returnByValue: true
      });
      console.log('👥 Support links found:', JSON.stringify(supportResult.result.value, null, 2));
      
    } else {
      console.log('❌ Failed to click project link');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

simpleClickTest();