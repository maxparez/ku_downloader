import CDP from 'chrome-remote-interface';

async function debug50Setting() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Check current state
    const urlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 Current URL:', urlResult.result.value);
    
    // First - ensure we're on the Podpořené osoby tab
    console.log('\n=== ENSURING WE ARE ON PODPOŘENÉ OSOBY TAB ===');
    const tabResult = await client.Runtime.evaluate({
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
    console.log('🖱️ Tab click:', tabResult.result.value);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Now check the selector more carefully
    console.log('\n=== DEBUGGING PAGE SIZE SELECTOR ===');
    const debugResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          // Look for all selects
          const allSelects = document.querySelectorAll('select');
          const selectInfo = [];
          
          for (let select of allSelects) {
            const options = Array.from(select.options).map(opt => ({
              value: opt.value,
              text: opt.textContent,
              selected: opt.selected
            }));
            
            selectInfo.push({
              className: select.className,
              id: select.id,
              name: select.name,
              currentValue: select.value,
              options: options,
              outerHTML: select.outerHTML.substring(0, 200)
            });
          }
          
          return selectInfo;
        })();
      `,
      returnByValue: true
    });
    
    console.log('🔍 All selects found:', JSON.stringify(debugResult.result.value, null, 2));
    
    // Try to change the correct selector
    console.log('\n=== TRYING TO CHANGE TO 50 ===');
    const changeResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          // Find the page size selector by content
          const selects = document.querySelectorAll('select');
          let pageSizeSelect = null;
          
          for (let select of selects) {
            const innerHTML = select.innerHTML;
            if (innerHTML.includes('Zobrazit') && innerHTML.includes('na stránku')) {
              pageSizeSelect = select;
              break;
            }
          }
          
          if (pageSizeSelect) {
            console.log('Found page size select, current value:', pageSizeSelect.value);
            
            // Set to 50
            pageSizeSelect.value = '50';
            
            // Try multiple event types
            const events = ['change', 'input', 'click'];
            for (let eventType of events) {
              const event = new Event(eventType, { bubbles: true, cancelable: true });
              pageSizeSelect.dispatchEvent(event);
            }
            
            // Also try form submission if select is in a form
            const form = pageSizeSelect.closest('form');
            if (form) {
              form.submit();
            }
            
            return {
              success: true,
              newValue: pageSizeSelect.value,
              hasForm: !!form
            };
          }
          
          return { success: false };
        })();
      `,
      returnByValue: true
    });
    
    console.log('📊 Change result:', JSON.stringify(changeResult.result.value, null, 2));
    
    if (changeResult.result.value.success) {
      console.log('⏳ Waiting longer for page update...');
      await new Promise(resolve => setTimeout(resolve, 8000));
      
      // Check if anything changed
      const afterResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
            let seenIds = new Set();
            
            for (let link of links) {
              const href = link.href;
              const match = href.match(/podporenaOsobaProjektuId=(\\d+)/);
              if (match) {
                seenIds.add(match[1]);
              }
            }
            
            return {
              totalLinks: links.length,
              uniqueParticipants: seenIds.size,
              participantIds: Array.from(seenIds)
            };
          })();
        `,
        returnByValue: true
      });
      
      console.log('👥 After change - participants:', JSON.stringify(afterResult.result.value, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

debug50Setting();