import CDP from 'chrome-remote-interface';

async function testFullOptimizedWorkflow() {
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
    
    // STEP 1: Check PDF download checkbox
    console.log('\n=== STEP 1: CHECKING PDF DOWNLOAD PERMISSION CHECKBOX ===');
    const checkboxResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const checkbox = document.getElementById('projektDetailTabs_Projekt_AllowDownloadPdfFormPO');
          if (checkbox) {
            return {
              exists: true,
              checked: checkbox.checked,
              disabled: checkbox.disabled,
              onclick: checkbox.getAttribute('onclick')
            };
          }
          
          // Alternative search
          const allCheckboxes = document.querySelectorAll('input[type="checkbox"]');
          for (let cb of allCheckboxes) {
            if (cb.id.includes('AllowDownloadPdfFormPO') || cb.name.includes('AllowDownloadPdfFormPO')) {
              return {
                exists: true,
                checked: cb.checked,
                disabled: cb.disabled,
                id: cb.id,
                name: cb.name,
                onclick: cb.getAttribute('onclick')
              };
            }
          }
          
          return { exists: false };
        })();
      `,
      returnByValue: true
    });
    
    console.log('☑️ PDF checkbox status:', JSON.stringify(checkboxResult.result.value, null, 2));
    
    // Ensure checkbox is checked
    if (checkboxResult.result.value.exists && !checkboxResult.result.value.checked) {
      console.log('⚠️ Checkbox not checked, checking it now...');
      const checkResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const checkbox = document.getElementById('projektDetailTabs_Projekt_AllowDownloadPdfFormPO') ||
                           document.querySelector('input[name*="AllowDownloadPdfFormPO"]');
            if (checkbox) {
              checkbox.checked = true;
              if (checkbox.onclick) {
                checkbox.onclick();
              } else if (window.AllowDownloadPdfFormPOItemClick) {
                window.AllowDownloadPdfFormPOItemClick(checkbox);
              }
              return true;
            }
            return false;
          })();
        `,
        returnByValue: true
      });
      console.log('✅ Checkbox checked:', checkResult.result.value);
    }
    
    // STEP 2: Ensure we're on Podpořené osoby tab
    console.log('\n=== STEP 2: ENSURING PODPOŘENÉ OSOBY TAB IS ACTIVE ===');
    const tabResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const tab = document.querySelector('a[href="#projektDetailTabs_ctl337"]');
          if (tab) {
            const isActive = tab.getAttribute('aria-expanded') === 'true';
            if (!isActive) {
              tab.click();
            }
            return { clicked: !isActive, tabText: tab.textContent.trim() };
          }
          return { clicked: false };
        })();
      `,
      returnByValue: true
    });
    
    console.log('📑 Tab status:', JSON.stringify(tabResult.result.value, null, 2));
    
    if (tabResult.result.value.clicked) {
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // STEP 3: Get list of participants with full URLs
    console.log('\n=== STEP 3: GETTING PARTICIPANTS WITH FULL URLS ===');
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
              
              // Ensure full URL format
              const fullUrl = href.includes('http') ? href : 
                'https://esf2014.esfcr.cz' + (href.startsWith('/') ? '' : '/') + href;
              
              participants.push({
                id: match[1],
                name: text,
                url: fullUrl
              });
            }
          }
          
          return {
            count: participants.length,
            participants: participants.slice(0, 3) // Test first 3
          };
        })();
      `,
      returnByValue: true
    });
    
    console.log('👥 Participants found:', JSON.stringify(participantsResult.result.value, null, 2));
    
    if (participantsResult.result.value.count === 0) {
      console.log('❌ No participants found. Check if tab is active and page size is set.');
      return;
    }
    
    // STEP 4: Test optimized workflow - direct navigation between participants
    console.log('\n=== STEP 4: TESTING OPTIMIZED WORKFLOW (NO BACK BUTTON) ===');
    
    const participants = participantsResult.result.value.participants;
    let downloadedCount = 0;
    
    for (let i = 0; i < participants.length; i++) {
      const participant = participants[i];
      console.log(`\n--- Processing ${i + 1}/${participants.length}: ${participant.name} ---`);
      
      // Direct navigation to participant
      console.log(`🚀 Navigating directly to: ${participant.id}`);
      await client.Runtime.evaluate({
        expression: `window.location.href = '${participant.url}';`,
        returnByValue: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Verify we're on correct page
      const verifyResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            return {
              currentUrl: window.location.href,
              hasCorrectId: window.location.href.includes('${participant.id}'),
              title: document.title
            };
          })();
        `,
        returnByValue: true
      });
      
      console.log('📍 Verification:', {
        hasCorrectId: verifyResult.result.value.hasCorrectId,
        title: verifyResult.result.value.title
      });
      
      // Click PDF button
      const pdfResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const button = document.getElementById('_TiskDoPdf');
            if (button && !button.disabled) {
              button.click();
              return { clicked: true, buttonText: button.textContent.trim() };
            }
            return { clicked: false, reason: button ? 'disabled' : 'not found' };
          })();
        `,
        returnByValue: true
      });
      
      console.log('📄 PDF download:', JSON.stringify(pdfResult.result.value, null, 2));
      
      if (pdfResult.result.value.clicked) {
        downloadedCount++;
        console.log('⏳ Waiting for PDF download...');
        await new Promise(resolve => setTimeout(resolve, 7000));
        console.log(`✅ PDF ${downloadedCount} downloaded`);
      }
      
      // NO BACK BUTTON - go directly to next participant
      if (i < participants.length - 1) {
        console.log('➡️ Moving to next participant (no back button needed)');
      }
    }
    
    console.log(`\n🎉 WORKFLOW COMPLETE! Downloaded ${downloadedCount} PDFs`);
    
    // STEP 5: Return to project detail for final check
    console.log('\n=== STEP 5: RETURNING TO PROJECT DETAIL ===');
    const projectUrl = 'https://esf2014.esfcr.cz/PublicPortal/Views/Projekty/ProjektDetailPage.aspx?action=get&projektId=76036';
    
    await client.Runtime.evaluate({
      expression: `window.location.href = '${projectUrl}';`,
      returnByValue: true
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Final verification
    const finalResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          return {
            currentUrl: window.location.href,
            isOnProjectDetail: window.location.href.includes('ProjektDetailPage'),
            activeTab: document.querySelector('a[aria-expanded="true"]')?.textContent.trim() || 'none'
          };
        })();
      `,
      returnByValue: true
    });
    
    console.log('🏁 Final state:', JSON.stringify(finalResult.result.value, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testFullOptimizedWorkflow();