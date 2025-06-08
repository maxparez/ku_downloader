import CDP from 'chrome-remote-interface';

async function checkParticipantsAgain() {
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
    
    // Wait a moment and then check participants
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('\n=== CHECKING PARTICIPANTS VISIBILITY ===');
    const participantsResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
          let seenIds = new Set();
          let participants = [];
          
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
          
          return {
            totalLinks: links.length,
            uniqueParticipants: seenIds.size,
            participants: participants.slice(0, 5) // First 5
          };
        })();
      `,
      returnByValue: true
    });
    
    console.log('👥 Participants check:', JSON.stringify(participantsResult.result.value, null, 2));
    
    // If no participants visible, try clicking the tab again
    if (participantsResult.result.value.uniqueParticipants === 0) {
      console.log('\n=== TRYING TO REFRESH TAB CONTENT ===');
      const tabClickResult = await client.Runtime.evaluate({
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
      
      console.log('🖱️ Tab refresh click:', tabClickResult.result.value);
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check again
      const participantsResult2 = await client.Runtime.evaluate({
        expression: `
          (function() {
            const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
            let seenIds = new Set();
            let participants = [];
            
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
            
            return {
              totalLinks: links.length,
              uniqueParticipants: seenIds.size,
              participants: participants.slice(0, 5)
            };
          })();
        `,
        returnByValue: true
      });
      
      console.log('👥 Participants after refresh:', JSON.stringify(participantsResult2.result.value, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

checkParticipantsAgain();