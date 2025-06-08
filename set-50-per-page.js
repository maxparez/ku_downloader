import CDP from 'chrome-remote-interface';

async function set50PerPage() {
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
    
    // Look for the page size selector
    console.log('\n=== LOOKING FOR PAGE SIZE SELECTOR ===');
    const selectorResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const select = document.querySelector('select.acgp-pageSize');
          if (select) {
            const options = Array.from(select.options).map(opt => ({
              value: opt.value,
              text: opt.textContent,
              selected: opt.selected
            }));
            
            return {
              found: true,
              currentValue: select.value,
              options: options
            };
          }
          
          return { found: false };
        })();
      `,
      returnByValue: true
    });
    
    console.log('🔍 Page size selector:', JSON.stringify(selectorResult.result.value, null, 2));
    
    if (selectorResult.result.value.found) {
      console.log('\n=== SETTING TO 50 PER PAGE ===');
      const changeResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const select = document.querySelector('select.acgp-pageSize');
            if (select) {
              // Set value to 50
              select.value = '50';
              
              // Trigger change event
              const changeEvent = new Event('change', { bubbles: true });
              select.dispatchEvent(changeEvent);
              
              return true;
            }
            return false;
          })();
        `,
        returnByValue: true
      });
      
      console.log('📊 Set to 50 per page:', changeResult.result.value);
      
      if (changeResult.result.value) {
        console.log('⏳ Waiting for page to reload with 50 entries...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Count participants now
        const countResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
              let seenIds = new Set();
              let uniqueParticipants = 0;
              
              for (let link of links) {
                const href = link.href;
                const match = href.match(/podporenaOsobaProjektuId=(\\d+)/);
                if (match && !seenIds.has(match[1])) {
                  seenIds.add(match[1]);
                  uniqueParticipants++;
                }
              }
              
              return {
                totalLinks: links.length,
                uniqueParticipants: uniqueParticipants
              };
            })();
          `,
          returnByValue: true
        });
        
        console.log('👥 Participants count:', JSON.stringify(countResult.result.value, null, 2));
        
        // Show first few participants
        const participantsResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              const participants = [];
              const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
              let seenIds = new Set();
              
              for (let link of links) {
                const href = link.href;
                const text = link.textContent.trim();
                
                const match = href.match(/podporenaOsobaProjektuId=(\\d+)/);
                if (match && !seenIds.has(match[1]) && text.length > 1) {
                  seenIds.add(match[1]);
                  participants.push({
                    id: match[1],
                    name: text
                  });
                }
              }
              
              return participants.slice(0, 10); // First 10 unique
            })();
          `,
          returnByValue: true
        });
        
        console.log('👥 First 10 participants:', JSON.stringify(participantsResult.result.value, null, 2));
      }
    } else {
      console.log('❌ Page size selector not found!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

set50PerPage();