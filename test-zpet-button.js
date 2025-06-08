import CDP from 'chrome-remote-interface';

async function testZpetButton() {
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
    
    // Look for the ZPĚT button
    console.log('\n=== LOOKING FOR ZPĚT BUTTON ===');
    const zpetResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          // Look for the breadcrumb ZPĚT button
          const zpetLink = document.querySelector('#breadcrumb_anchor, a[href*="ProjektDetailPage"]');
          
          if (zpetLink) {
            return {
              found: true,
              text: zpetLink.textContent.trim(),
              href: zpetLink.href,
              id: zpetLink.id,
              className: zpetLink.className
            };
          }
          
          // Alternative search for any element containing "ZPĚT"
          const allElements = document.querySelectorAll('*');
          for (let element of allElements) {
            const text = element.textContent || '';
            if (text.includes('ZPĚT') && element.tagName === 'A') {
              return {
                found: true,
                text: text.trim(),
                href: element.href,
                id: element.id,
                className: element.className,
                tag: element.tagName
              };
            }
          }
          
          return { found: false };
        })();
      `,
      returnByValue: true
    });
    
    console.log('🔍 ZPĚT button:', JSON.stringify(zpetResult.result.value, null, 2));
    
    if (zpetResult.result.value.found) {
      console.log('\n=== CLICKING ZPĚT BUTTON ===');
      
      const clickResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            // Try to find and click the ZPĚT button
            const zpetLink = document.querySelector('#breadcrumb_anchor') || 
                           document.querySelector('a[href*="ProjektDetailPage"]');
            
            if (zpetLink && zpetLink.textContent.includes('ZPĚT')) {
              zpetLink.click();
              return { 
                clicked: true, 
                href: zpetLink.href,
                text: zpetLink.textContent.trim()
              };
            }
            
            // Alternative search
            const allLinks = document.querySelectorAll('a');
            for (let link of allLinks) {
              if (link.textContent.includes('ZPĚT')) {
                link.click();
                return { 
                  clicked: true, 
                  href: link.href,
                  text: link.textContent.trim()
                };
              }
            }
            
            return { clicked: false };
          })();
        `,
        returnByValue: true
      });
      
      console.log('🖱️ ZPĚT click result:', JSON.stringify(clickResult.result.value, null, 2));
      
      if (clickResult.result.value.clicked) {
        console.log('⏳ Waiting for navigation back to project detail...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check new URL
        const newUrlResult = await client.Runtime.evaluate({
          expression: 'window.location.href',
          returnByValue: true
        });
        console.log('📍 After ZPĚT click:', newUrlResult.result.value);
        
        // Verify we're back on project detail with Podpořené osoby tab
        if (newUrlResult.result.value.includes('ProjektDetailPage')) {
          console.log('✅ Successfully returned to project detail page');
          
          // Check if Podpořené osoby tab is active
          const tabCheckResult = await client.Runtime.evaluate({
            expression: `
              (function() {
                const activeTab = document.querySelector('a[aria-expanded="true"]');
                if (activeTab) {
                  return {
                    activeTab: activeTab.textContent.trim(),
                    href: activeTab.getAttribute('href')
                  };
                }
                return { activeTab: 'none' };
              })();
            `,
            returnByValue: true
          });
          
          console.log('🔍 Active tab after return:', JSON.stringify(tabCheckResult.result.value, null, 2));
          
          // If not on Podpořené osoby tab, click it
          if (!tabCheckResult.result.value.activeTab.includes('Podpořené osoby')) {
            console.log('\n=== CLICKING PODPOŘENÉ OSOBY TAB ===');
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
            
            console.log('🖱️ Tab click:', tabClickResult.result.value);
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
          // Count participants to verify we're back
          const participantCountResult = await client.Runtime.evaluate({
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
                  uniqueParticipants: seenIds.size
                };
              })();
            `,
            returnByValue: true
          });
          
          console.log('👥 Participants visible after return:', JSON.stringify(participantCountResult.result.value, null, 2));
        }
      }
    } else {
      console.log('❌ ZPĚT button not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testZpetButton();