import CDP from 'chrome-remote-interface';

async function checkCurrentState() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Get current URL and title
    const urlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    
    const titleResult = await client.Runtime.evaluate({
      expression: 'document.title',
      returnByValue: true
    });
    
    console.log('📍 Current URL:', urlResult.result.value);
    console.log('📄 Page title:', titleResult.result.value);
    
    // Check if we're on project detail page
    if (urlResult.result.value.includes('ProjektDetailPage')) {
      console.log('\n=== PROJECT DETAIL PAGE DETECTED ===');
      
      // Check active tab
      const tabResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const activeTab = document.querySelector('a[aria-expanded="true"]');
            if (activeTab) {
              return {
                text: activeTab.textContent.trim(),
                href: activeTab.getAttribute('href')
              };
            }
            return null;
          })();
        `,
        returnByValue: true
      });
      
      console.log('🔍 Active tab:', JSON.stringify(tabResult.result.value, null, 2));
      
      // Check if we can see participants
      const participantsResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
            let seenIds = new Set();
            
            for (let link of links) {
              const href = link.href;
              const text = link.textContent.trim();
              
              const match = href.match(/podporenaOsobaProjektuId=(\\d+)/);
              if (match && !seenIds.has(match[1]) && text.length > 1) {
                seenIds.add(match[1]);
              }
            }
            
            return {
              totalLinks: links.length,
              uniqueParticipants: seenIds.size,
              participantIds: Array.from(seenIds).slice(0, 5)
            };
          })();
        `,
        returnByValue: true
      });
      
      console.log('👥 Participants visible:', JSON.stringify(participantsResult.result.value, null, 2));
      
      // Check page size setting
      const pageSizeResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const selects = document.querySelectorAll('select.acgp-pageSize');
            const selectInfo = [];
            
            for (let select of selects) {
              const style = window.getComputedStyle(select);
              const parent = select.closest('.tab-pane');
              
              if (style.display !== 'none' && (!parent || window.getComputedStyle(parent).display !== 'none')) {
                selectInfo.push({
                  currentValue: select.value,
                  options: Array.from(select.options).map(opt => ({
                    value: opt.value,
                    text: opt.textContent,
                    selected: opt.selected
                  }))
                });
              }
            }
            
            return {
              totalSelects: selects.length,
              visibleSelects: selectInfo.length,
              selectInfo: selectInfo
            };
          })();
        `,
        returnByValue: true
      });
      
      console.log('📊 Page size settings:', JSON.stringify(pageSizeResult.result.value, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkCurrentState();