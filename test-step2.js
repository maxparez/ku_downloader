import CDP from 'chrome-remote-interface';

async function testStep2() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Check current page
    const urlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 Current URL:', urlResult.result.value);
    
    // Look for support links
    console.log('\n=== STEP 2: Find Support Links ===');
    const supportResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const links = document.querySelectorAll('a');
          const supportLinks = [];
          
          for (let link of links) {
            const text = link.textContent || '';
            const href = link.href || '';
            
            // Look for various patterns
            if (text.includes('Seznam podpořených') || 
                text.includes('podpořených osob') ||
                text.includes('Podpořené osoby') ||
                text.includes('účastníci') ||
                text.includes('Účastníci') ||
                href.includes('PodporenaOsoba')) {
              supportLinks.push({
                text: text.trim(),
                href: href
              });
            }
          }
          
          return supportLinks;
        })();
      `,
      returnByValue: true
    });
    
    console.log('👥 Support links found:', JSON.stringify(supportResult.result.value, null, 2));
    
    if (supportResult.result.value && supportResult.result.value.length > 0) {
      // Click the first support link
      console.log('\n=== CLICK SUPPORT LINK ===');
      const clickResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const links = document.querySelectorAll('a');
            
            for (let link of links) {
              const text = link.textContent || '';
              const href = link.href || '';
              
              if (text.includes('Seznam podpořených') || 
                  href.includes('PodporenaOsoba')) {
                link.click();
                return true;
              }
            }
            
            return false;
          })();
        `,
        returnByValue: true
      });
      
      console.log('🖱️ Support link click:', clickResult.result.value);
      
      if (clickResult.result.value) {
        console.log('⏳ Waiting for participants page...');
        await new Promise(resolve => setTimeout(resolve, 7000));
        
        // Check new page
        const newUrlResult = await client.Runtime.evaluate({
          expression: 'window.location.href',
          returnByValue: true
        });
        console.log('📍 New URL:', newUrlResult.result.value);
        
        const newTitleResult = await client.Runtime.evaluate({
          expression: 'document.title',
          returnByValue: true
        });
        console.log('📄 New title:', newTitleResult.result.value);
      }
    } else {
      console.log('❌ No support links found! Let me check all links:');
      
      // Show all links for debugging
      const allLinksResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const links = document.querySelectorAll('a');
            const allLinks = [];
            
            for (let i = 0; i < Math.min(links.length, 10); i++) {
              const link = links[i];
              allLinks.push({
                text: link.textContent.trim().substring(0, 50),
                href: link.href
              });
            }
            
            return allLinks;
          })();
        `,
        returnByValue: true
      });
      console.log('🔗 First 10 links on page:', JSON.stringify(allLinksResult.result.value, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testStep2();