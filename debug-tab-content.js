import CDP from 'chrome-remote-interface';

async function debugTabContent() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Debug the tab structure
    console.log('\n=== DEBUGGING TAB STRUCTURE ===');
    const tabDebugResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const info = {};
          
          // Check if the tab content exists
          const tabContent1 = document.getElementById('projektDetailTabs_ctl337');
          info.tabContentById = !!tabContent1;
          
          // Look for tab content by other means
          const tabPanes = document.querySelectorAll('.tab-pane, [id*="projektDetailTabs"]');
          info.tabPanes = tabPanes.length;
          
          // Look for active tab content
          const activeTab = document.querySelector('.tab-pane.active');
          info.hasActiveTab = !!activeTab;
          if (activeTab) {
            info.activeTabId = activeTab.id;
          }
          
          // Look for any element containing page size selects near "Podpořené osoby"
          const allSelects = document.querySelectorAll('select.acgp-pageSize');
          info.totalPageSizeSelects = allSelects.length;
          
          // Find which selects are visible (not hidden)
          let visibleSelects = 0;
          for (let select of allSelects) {
            const style = window.getComputedStyle(select);
            const parent = select.closest('.tab-pane');
            if (style.display !== 'none' && (!parent || window.getComputedStyle(parent).display !== 'none')) {
              visibleSelects++;
            }
          }
          info.visiblePageSizeSelects = visibleSelects;
          
          // Check the current active tab
          const activeTabLink = document.querySelector('a[aria-expanded="true"]');
          if (activeTabLink) {
            info.activeTabText = activeTabLink.textContent.trim();
            info.activeTabHref = activeTabLink.getAttribute('href');
          }
          
          return info;
        })();
      `,
      returnByValue: true
    });
    
    console.log('🔍 Tab debug info:', JSON.stringify(tabDebugResult.result.value, null, 2));
    
    // Try to find and change any visible page size select
    console.log('\n=== TRYING TO CHANGE VISIBLE PAGE SIZE SELECT ===');
    const changeResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const allSelects = document.querySelectorAll('select.acgp-pageSize');
          
          for (let select of allSelects) {
            const style = window.getComputedStyle(select);
            const parent = select.closest('.tab-pane, div[id*="tab"]');
            
            // Check if this select is visible
            if (style.display !== 'none' && 
                (!parent || window.getComputedStyle(parent).display !== 'none')) {
              
              // Found a visible select, try to change it
              const originalValue = select.value;
              select.value = '50';
              
              // Trigger change
              const changeEvent = new Event('change', { bubbles: true });
              select.dispatchEvent(changeEvent);
              
              // Also try executing onchange if it exists
              if (select.onchange) {
                select.onchange();
              }
              
              return {
                success: true,
                originalValue: originalValue,
                newValue: select.value,
                onchange: select.getAttribute('onchange'),
                parentId: parent ? parent.id : 'no parent'
              };
            }
          }
          
          return { success: false, reason: 'No visible page size select found' };
        })();
      `,
      returnByValue: true
    });
    
    console.log('📊 Change attempt:', JSON.stringify(changeResult.result.value, null, 2));
    
    if (changeResult.result.value.success) {
      console.log('⏳ Waiting for update...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Count participants
      const countResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
            let seenIds = new Set();
            
            for (let link of links) {
              const style = window.getComputedStyle(link);
              if (style.display !== 'none') {
                const match = link.href.match(/podporenaOsobaProjektuId=(\\d+)/);
                if (match) {
                  seenIds.add(match[1]);
                }
              }
            }
            
            return {
              visibleParticipants: seenIds.size,
              participantIds: Array.from(seenIds)
            };
          })();
        `,
        returnByValue: true
      });
      
      console.log('👥 Participant count:', JSON.stringify(countResult.result.value, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

debugTabContent();