import CDP from 'chrome-remote-interface';

async function clickTabCorrect() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    // Connect to the ESF tab specifically
    client = await CDP({ 
      port: 9222,
      target: 'page/497D8510DF4D9F6EB85C9BC7A5F4BECE'
    });
    
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
              href: tab.getAttribute('href'),
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
                href: tab.getAttribute('href'),
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
            const tab = document.querySelector('a[href="#projektDetailTabs_ctl337"]');
            
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
              
              // Look for participant links after tab click
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
              
              return participants;
            })();
          `,
          returnByValue: true
        });
        
        console.log('👥 Participants found:', JSON.stringify(participantsResult.result.value, null, 2));
        console.log(`✅ Found ${participantsResult.result.value.length} participants!`);
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
                href: tab.getAttribute('href'),
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

clickTabCorrect();