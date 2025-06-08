import CDP from 'chrome-remote-interface';

async function navigateAndSet50() {
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
    
    // If we're on DevTools, navigate to the ESF page
    if (urlResult.result.value.includes('devtools://')) {
      console.log('🔄 Navigating to ESF project detail page...');
      await client.Runtime.evaluate({
        expression: 'window.location.href = "https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/ProjektDetailPage.aspx?action=get&projektId=76036";',
        returnByValue: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Click on Podpořené osoby tab
      console.log('🖱️ Clicking Podpořené osoby tab...');
      await client.Runtime.evaluate({
        expression: `
          const tab = document.querySelector('a[href="#projektDetailTabs_ctl337"]');
          if (tab) {
            tab.click();
          }
        `,
        returnByValue: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Now look for the page size selector
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
          
          // Fallback - look for any select with page size options
          const selects = document.querySelectorAll('select');
          for (let select of selects) {
            const text = select.innerHTML;
            if (text.includes('Zobrazit') && text.includes('na stránku')) {
              const options = Array.from(select.options).map(opt => ({
                value: opt.value,
                text: opt.textContent,
                selected: opt.selected
              }));
              
              return {
                found: true,
                currentValue: select.value,
                options: options,
                className: select.className
              };
            }
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
            // Try both selectors
            let select = document.querySelector('select.acgp-pageSize');
            if (!select) {
              const selects = document.querySelectorAll('select');
              for (let s of selects) {
                if (s.innerHTML.includes('Zobrazit') && s.innerHTML.includes('na stránku')) {
                  select = s;
                  break;
                }
              }
            }
            
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
        
        console.log('👥 Participants count after 50 per page:', JSON.stringify(countResult.result.value, null, 2));
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

navigateAndSet50();