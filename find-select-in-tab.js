import CDP from 'chrome-remote-interface';

async function findSelectInTab() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Find select specifically in the Podpořené osoby tab
    console.log('\n=== FINDING SELECT IN PODPOŘENÉ OSOBY TAB ===');
    const tabSelectResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          // Look for the tab content div
          const tabContent = document.getElementById('projektDetailTabs_ctl337');
          if (!tabContent) {
            return { found: false, error: 'Tab content not found' };
          }
          
          // Find page size selects within this tab
          const selects = tabContent.querySelectorAll('select.acgp-pageSize');
          const selectInfo = [];
          
          for (let select of selects) {
            selectInfo.push({
              onchange: select.getAttribute('onchange'),
              currentValue: select.value,
              options: Array.from(select.options).map(opt => ({
                value: opt.value,
                text: opt.textContent,
                selected: opt.selected
              })),
              outerHTML: select.outerHTML.substring(0, 200)
            });
          }
          
          return {
            found: true,
            selectCount: selects.length,
            selects: selectInfo
          };
        })();
      `,
      returnByValue: true
    });
    
    console.log('🔍 Selects in Podpořené osoby tab:', JSON.stringify(tabSelectResult.result.value, null, 2));
    
    if (tabSelectResult.result.value.found && tabSelectResult.result.value.selectCount > 0) {
      console.log('\n=== CHANGING FIRST SELECT IN TAB TO 50 ===');
      const changeResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const tabContent = document.getElementById('projektDetailTabs_ctl337');
            if (!tabContent) return { success: false, error: 'Tab not found' };
            
            const select = tabContent.querySelector('select.acgp-pageSize');
            if (!select) return { success: false, error: 'Select not found' };
            
            // Store original value
            const originalValue = select.value;
            
            // Set to 50
            select.value = '50';
            
            // Get the onchange attribute and execute it
            const onchangeAttr = select.getAttribute('onchange');
            if (onchangeAttr) {
              // Try to execute the onchange code
              try {
                eval(onchangeAttr.replace('this.value', '50'));
              } catch (e) {
                // If eval fails, try triggering events
                const changeEvent = new Event('change', { bubbles: true });
                select.dispatchEvent(changeEvent);
              }
            } else {
              // Trigger change event
              const changeEvent = new Event('change', { bubbles: true });
              select.dispatchEvent(changeEvent);
            }
            
            return {
              success: true,
              originalValue: originalValue,
              newValue: select.value,
              onchange: onchangeAttr
            };
          })();
        `,
        returnByValue: true
      });
      
      console.log('📊 Change result:', JSON.stringify(changeResult.result.value, null, 2));
      
      if (changeResult.result.value.success) {
        console.log('⏳ Waiting for page update...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Check participants count
        const countResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              const tabContent = document.getElementById('projektDetailTabs_ctl337');
              if (!tabContent) return { error: 'Tab not found' };
              
              const links = tabContent.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
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
                uniqueParticipants: participants.length,
                participants: participants.slice(0, 10) // First 10
              };
            })();
          `,
          returnByValue: true
        });
        
        console.log('👥 Participants after change:', JSON.stringify(countResult.result.value, null, 2));
        
        if (countResult.result.value.uniqueParticipants > 5) {
          console.log(`🎉 SUCCESS! Now showing ${countResult.result.value.uniqueParticipants} participants!`);
        } else {
          console.log('⚠️ Still only 5 participants - the change might not have worked');
        }
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

findSelectInTab();