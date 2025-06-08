import CDP from 'chrome-remote-interface';

async function testFixedClick() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Test the corrected selector
    console.log('\n=== TEST CORRECTED SELECTOR ===');
    const testResult = await client.Runtime.evaluate({
      expression: `
        // Look directly for the project link with 2799
        const projectLink = document.querySelector('a[href*="ProjektDetailPage"][href*="projektId=76036"]');
        
        if (projectLink) {
          ({
            found: true,
            text: projectLink.textContent.trim(),
            href: projectLink.href
          });
        } else {
          // Fallback: find any link containing 2799
          const links = document.querySelectorAll('a');
          for (let link of links) {
            if (link.textContent.includes('2799')) {
              return {
                found: true,
                text: link.textContent.trim(),
                href: link.href
              };
            }
          }
          ({ found: false });
        }
      `,
      returnByValue: true
    });
    console.log('🔍 Link test result:', JSON.stringify(testResult.result.value, null, 2));
    
    if (!testResult.result.value.found) {
      console.log('❌ Still cannot find project link!');
      return;
    }
    
    // Now test the click
    console.log('\n=== TEST CLICK ===');
    const clickResult = await client.Runtime.evaluate({
      expression: `
        // Find and click the project link
        const projectLink = document.querySelector('a[href*="ProjektDetailPage"]');
        if (projectLink && projectLink.textContent.includes('2799')) {
          projectLink.click();
          true;
        } else {
          false;
        }
      `,
      returnByValue: true
    });
    
    console.log('🖱️ Click result:', clickResult.result.value);
    
    if (clickResult.result.value) {
      console.log('⏳ Waiting for navigation...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
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
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testFixedClick();