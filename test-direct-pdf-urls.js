import CDP from 'chrome-remote-interface';

async function testDirectPDFUrls() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Test various possible PDF URL patterns
    const participantId = '2371983'; // Hana's ID
    const projektId = '76036';
    
    const possibleUrls = [
      // Direct PDF URLs
      `https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/PodporenaOsobaProjektuDetailPage.aspx?action=pdf&podporenaOsobaProjektuId=${participantId}`,
      `https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/PodporenaOsobaProjektuDetailPage.aspx?action=downloadPdf&podporenaOsobaProjektuId=${participantId}`,
      `https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/PodporenaOsobaPdf.aspx?podporenaOsobaProjektuId=${participantId}`,
      `https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/TiskDoPdf.aspx?podporenaOsobaProjektuId=${participantId}`,
      `https://esf2014.esfcr.cz/PublicPortal/Export/PodporenaOsoba.pdf?id=${participantId}`,
      
      // With projekt ID
      `https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/PodporenaOsobaPdf.aspx?projektId=${projektId}&podporenaOsobaProjektuId=${participantId}`,
      `https://esf2014.esfcr.cz/PublicPortal/Export/PodporenaOsoba.pdf?projektId=${projektId}&id=${participantId}`,
      
      // Different actions
      `https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/PodporenaOsobaProjektuDetailPage.aspx?action=export&type=pdf&podporenaOsobaProjektuId=${participantId}`,
      `https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/PodporenaOsobaProjektuDetailPage.aspx?action=print&format=pdf&podporenaOsobaProjektuId=${participantId}`
    ];
    
    console.log(`\n=== TESTING ${possibleUrls.length} POSSIBLE PDF URL PATTERNS ===`);
    
    for (let i = 0; i < possibleUrls.length; i++) {
      const testUrl = possibleUrls[i];
      console.log(`\n${i + 1}. Testing: ${testUrl}`);
      
      try {
        // Navigate to test URL
        await client.Runtime.evaluate({
          expression: `window.location.href = '${testUrl}';`,
          returnByValue: true
        });
        
        await new Promise(resolve => setTimeout(resolve, 4000));
        
        // Check result
        const result = await client.Runtime.evaluate({
          expression: `
            (function() {
              return {
                currentUrl: window.location.href,
                title: document.title,
                bodyText: document.body ? document.body.textContent.substring(0, 200) : 'no body',
                isError: document.title.toLowerCase().includes('error') || 
                         document.body.textContent.toLowerCase().includes('error') ||
                         document.body.textContent.toLowerCase().includes('not found'),
                isPDF: document.contentType === 'application/pdf' || 
                       window.location.href.endsWith('.pdf')
              };
            })();
          `,
          returnByValue: true
        });
        
        console.log(`   Result: ${result.result.value.isError ? '❌ Error' : result.result.value.isPDF ? '🎉 PDF!' : '❓ Unknown'}`);
        if (result.result.value.isError) {
          console.log(`   Error: ${result.result.value.title}`);
        } else if (result.result.value.isPDF) {
          console.log(`   🎯 SUCCESS! Direct PDF URL found: ${testUrl}`);
          break;
        } else {
          console.log(`   Title: ${result.result.value.title}`);
          console.log(`   Content: ${result.result.value.bodyText.substring(0, 100)}...`);
        }
        
      } catch (error) {
        console.log(`   ❌ Navigation error: ${error.message}`);
      }
    }
    
    console.log('\n=== TESTING POST-BASED PDF GENERATION ===');
    
    // Test if we can do POST request programmatically
    const postTestResult = await client.Runtime.evaluate({
      expression: `
        (async function() {
          try {
            // Try to construct the POST request with proper form data
            const formData = new FormData();
            formData.append('__EVENTTARGET', 'ctl00$ctl00$_TiskDoPdf');
            formData.append('__EVENTARGUMENT', '');
            // Note: In real scenario we'd need the actual ViewState and EventValidation
            
            const response = await fetch('https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/PodporenaOsobaProjektuDetailPage.aspx?action=get&podporenaOsobaProjektuId=${participantId}&akceProjektuId=null&aktualni=True&zorMscId=null', {
              method: 'POST',
              body: formData,
              credentials: 'include'
            });
            
            return {
              status: response.status,
              contentType: response.headers.get('content-type'),
              url: response.url
            };
          } catch (error) {
            return { error: error.message };
          }
        })();
      `,
      returnByValue: true
    });
    
    console.log('📮 POST test result:', JSON.stringify(postTestResult.result.value, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testDirectPDFUrls();