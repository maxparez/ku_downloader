import CDP from 'chrome-remote-interface';

async function simpleTabClick() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Check current URL first
    const urlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 Current URL:', urlResult.result.value);
    
    // If we're on DevTools, we need to navigate to the ESF page
    if (urlResult.result.value.includes('devtools://')) {
      console.log('🔄 Navigating to ESF project detail page...');
      await client.Runtime.evaluate({
        expression: 'window.location.href = "https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/ProjektDetailPage.aspx?action=get&projektId=76036";',
        returnByValue: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    // Now look for the tab
    console.log('\n=== LOOKING FOR SUPPORTED PERSONS TAB ===');
    const tabResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const tabs = document.querySelectorAll('a');
          
          for (let tab of tabs) {
            const text = tab.textContent || '';
            const href = tab.getAttribute('href') || '';
            
            if (text.includes('Podpořené osoby') && href.includes('#projektDetailTabs_ctl337')) {
              return {
                found: true,
                text: text.trim(),
                href: href
              };
            }
          }
          
          return { found: false };
        })();
      `,
      returnByValue: true
    });
    
    console.log('🔍 Tab found:', JSON.stringify(tabResult.result.value, null, 2));
    
    if (tabResult.result.value.found) {
      console.log('\n=== CLICKING TAB ===');
      const clickResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const tab = document.querySelector('a[href="#projektDetailTabs_ctl337"]');
            if (tab) {
              tab.click();
              return true;
            }
            return false;
          })();
        `,
        returnByValue: true
      });
      
      console.log('🖱️ Click result:', clickResult.result.value);
      
      if (clickResult.result.value) {
        console.log('⏳ Waiting 3 seconds for tab content...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check if participants are now visible
        const participantsResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              const participants = [];
              const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
              
              for (let i = 0; i < Math.min(links.length, 5); i++) {
                const link = links[i];
                const text = link.textContent.trim();
                const href = link.href;
                
                if (text.length > 1) {
                  participants.push({
                    name: text,
                    url: href
                  });
                }
              }
              
              return participants;
            })();
          `,
          returnByValue: true
        });
        
        console.log('👥 Participants visible:', JSON.stringify(participantsResult.result.value, null, 2));
        console.log(`✅ Found ${participantsResult.result.value.length} participants in tab!`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

simpleTabClick();