import CDP from 'chrome-remote-interface';

async function clickTab() {
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
    
    // Look for the tab
    console.log('\n=== LOOKING FOR SUPPORTED PERSONS TAB ===');
    const tabResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          // Look for the specific tab element
          const tab = document.querySelector('a[href="#projektDetailTabs_ctl337"]');
          if (tab) {
            return {
              found: true,
              text: tab.textContent.trim(),
              href: tab.href,
              classes: tab.className
            };
          }
          
          // Fallback - look for any tab with "Podpořené osoby"
          const tabs = document.querySelectorAll('a[data-toggle="tab"]');
          for (let tab of tabs) {
            if (tab.textContent.includes('Podpořené osoby')) {
              return {
                found: true,
                text: tab.textContent.trim(),
                href: tab.href,
                classes: tab.className
              };
            }
          }
          
          return { found: false };
        })();
      `,
      returnByValue: true
    });
    
    console.log('🔍 Tab search result:', JSON.stringify(tabResult.result.value, null, 2));
    
    if (tabResult.result.value.found) {
      console.log('\n=== CLICKING THE TAB ===');
      const clickResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const tab = document.querySelector('a[href="#projektDetailTabs_ctl337"]') || 
                       document.querySelector('a[data-toggle="tab"][href*="podporene"], a[data-toggle="tab"][href*="osoby"]');
            
            if (tab && tab.textContent.includes('Podpořené osoby')) {
              tab.click();
              return true;
            }
            return false;
          })();
        `,
        returnByValue: true
      });
      
      console.log('🖱️ Tab click result:', clickResult.result.value);
      
      if (clickResult.result.value) {
        console.log('⏳ Waiting for tab content to load...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Now look for participants in the tab
        console.log('\n=== LOOKING FOR PARTICIPANTS IN TAB ===');
        const participantsResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              const participants = [];
              
              // Look for participant links
              const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
              let seenIds = new Set();
              
              for (let link of links) {
                const href = link.href;
                const text = link.textContent.trim();
                
                // Extract participant ID from URL
                const match = href.match(/podporenaOsobaProjektuId=(\\d+)/);
                if (match && !seenIds.has(match[1]) && text.length > 1) {
                  seenIds.add(match[1]);
                  participants.push({
                    id: match[1],
                    name: text,
                    url: href
                  });
                }
              }
              
              return participants.slice(0, 5); // First 5
            })();
          `,
          returnByValue: true
        });
        
        console.log('👥 Participants found:', JSON.stringify(participantsResult.result.value, null, 2));
      }
    } else {
      console.log('❌ Tab "Podpořené osoby" not found!');
      
      // Show all tabs for debugging
      const allTabsResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const tabs = document.querySelectorAll('a[data-toggle="tab"]');
            const tabInfo = [];
            
            for (let tab of tabs) {
              tabInfo.push({
                text: tab.textContent.trim(),
                href: tab.href,
                ariaControls: tab.getAttribute('aria-controls')
              });
            }
            
            return tabInfo;
          })();
        `,
        returnByValue: true
      });
      console.log('🔗 All tabs found:', JSON.stringify(allTabsResult.result.value, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

clickTab();