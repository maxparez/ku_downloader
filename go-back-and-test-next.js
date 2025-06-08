import CDP from 'chrome-remote-interface';

async function goBackAndTestNext() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Go back to project detail page
    console.log('⬅️ Going back to project detail...');
    await client.Runtime.evaluate({
      expression: 'window.history.back();',
      returnByValue: true
    });
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check where we are
    const urlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 After going back:', urlResult.result.value);
    
    // Make sure we're on the Podpořené osoby tab
    console.log('\n=== ENSURING PODPOŘENÉ OSOBY TAB IS ACTIVE ===');
    const tabResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const tab = document.querySelector('a[href="#projektDetailTabs_ctl337"]');
          if (tab) {
            tab.click();
            return { clicked: true, text: tab.textContent.trim() };
          }
          return { clicked: false };
        })();
      `,
      returnByValue: true
    });
    
    console.log('🖱️ Tab click:', JSON.stringify(tabResult.result.value, null, 2));
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Get second participant
    console.log('\n=== GETTING SECOND PARTICIPANT ===');
    const participantResult = await client.Runtime.evaluate({
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
                name: text,
                url: href
              });
            }
          }
          
          // Return second participant (index 1)
          return participants.length > 1 ? participants[1] : null;
        })();
      `,
      returnByValue: true
    });
    
    console.log('👤 Second participant:', JSON.stringify(participantResult.result.value, null, 2));
    
    if (participantResult.result.value) {
      const participant = participantResult.result.value;
      
      console.log(`\n=== CLICKING ON ${participant.name} ===`);
      const clickResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const links = document.querySelectorAll('a[href*="podporenaOsobaProjektuId=${participant.id}"]');
            if (links.length > 0) {
              links[0].click();
              return true;
            }
            return false;
          })();
        `,
        returnByValue: true
      });
      
      console.log('🖱️ Participant click:', clickResult.result.value);
      
      if (clickResult.result.value) {
        console.log('⏳ Waiting for participant detail page...');
        await new Promise(resolve => setTimeout(resolve, 7000));
        
        // Check new URL
        const newUrlResult = await client.Runtime.evaluate({
          expression: 'window.location.href',
          returnByValue: true
        });
        console.log('📍 New participant detail URL:', newUrlResult.result.value);
        
        // Check if PDF button exists
        const buttonResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              const button = document.getElementById('_TiskDoPdf');
              return button ? {
                exists: true,
                text: button.textContent.trim(),
                disabled: button.disabled
              } : { exists: false };
            })();
          `,
          returnByValue: true
        });
        
        console.log('🔘 PDF button:', JSON.stringify(buttonResult.result.value, null, 2));
        
        if (buttonResult.result.value.exists && !buttonResult.result.value.disabled) {
          console.log('\n=== CLICKING PDF BUTTON FOR SECOND PARTICIPANT ===');
          
          const pdfClickResult = await client.Runtime.evaluate({
            expression: `
              (function() {
                const button = document.getElementById('_TiskDoPdf');
                if (button) {
                  button.click();
                  return true;
                }
                return false;
              })();
            `,
            returnByValue: true
          });
          
          console.log('🖱️ PDF button click:', pdfClickResult.result.value);
          
          if (pdfClickResult.result.value) {
            console.log('⏳ Waiting for PDF download...');
            await new Promise(resolve => setTimeout(resolve, 8000));
            console.log('✅ Second PDF download should be complete!');
          }
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

goBackAndTestNext();