import CDP from 'chrome-remote-interface';

async function finalClickTest() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // First - verify we can find the link
    console.log('\n=== VERIFY LINK EXISTS ===');
    const verifyResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const links = document.querySelectorAll('a');
          let foundLinks = [];
          
          for (let link of links) {
            const text = link.textContent || '';
            const href = link.href || '';
            
            if (text.includes('2799')) {
              foundLinks.push({
                text: text.trim(),
                href: href,
                hasDetailPage: href.includes('ProjektDetailPage')
              });
            }
          }
          
          return foundLinks;
        })();
      `,
      returnByValue: true
    });
    
    console.log('🔍 Found links:', JSON.stringify(verifyResult.result.value, null, 2));
    
    if (!verifyResult.result.value || verifyResult.result.value.length === 0) {
      console.log('❌ No links with 2799 found!');
      return;
    }
    
    // Now click it
    console.log('\n=== CLICK THE LINK ===');
    const clickResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const links = document.querySelectorAll('a');
          
          for (let link of links) {
            const text = link.textContent || '';
            const href = link.href || '';
            
            if (text.includes('2799') && href.includes('ProjektDetailPage')) {
              link.click();
              return true;
            }
          }
          
          return false;
        })();
      `,
      returnByValue: true
    });
    
    console.log('🖱️ Click successful:', clickResult.result.value);
    
    if (clickResult.result.value) {
      console.log('⏳ Waiting for page to load...');
      await new Promise(resolve => setTimeout(resolve, 7000));
      
      // Check new page
      const urlResult = await client.Runtime.evaluate({
        expression: 'window.location.href',
        returnByValue: true
      });
      console.log('📍 New URL:', urlResult.result.value);
      
      const titleResult = await client.Runtime.evaluate({
        expression: 'document.title',
        returnByValue: true
      });
      console.log('📄 New title:', titleResult.result.value);
      
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

finalClickTest();