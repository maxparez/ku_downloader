import CDP from 'chrome-remote-interface';

async function testStep3PDF() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Check current page
    const urlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 Current URL:', urlResult.result.value);
    
    // Extract first few participants
    console.log('\n=== STEP 3: Extract Participants ===');
    const participantsResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const participants = [];
          const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
          
          let seenIds = new Set();
          
          for (let link of links) {
            const href = link.href;
            const text = link.textContent.trim();
            
            // Extract participant ID from URL
            const match = href.match(/podporenaOsobaProjektuId=(\\d+)/);
            if (match && !seenIds.has(match[1])) {
              seenIds.add(match[1]);
              participants.push({
                name: text,
                id: match[1],
                url: href
              });
            }
          }
          
          return participants.slice(0, 5); // First 5 unique participants
        })();
      `,
      returnByValue: true
    });
    
    console.log('👥 First 5 participants:', JSON.stringify(participantsResult.result.value, null, 2));
    
    if (participantsResult.result.value && participantsResult.result.value.length > 0) {
      const firstParticipant = participantsResult.result.value[0];
      console.log(`\\n=== CLICK ON FIRST PARTICIPANT: ${firstParticipant.name} ===`);
      
      // Click on first participant
      const clickResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const firstLink = document.querySelector('a[href*="podporenaOsobaProjektuId=${firstParticipant.id}"]');
            if (firstLink) {
              firstLink.click();
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
        
        // Check new page
        const newUrlResult = await client.Runtime.evaluate({
          expression: 'window.location.href',
          returnByValue: true
        });
        console.log('📍 Participant URL:', newUrlResult.result.value);
        
        // Look for PDF download buttons/links
        console.log('\\n=== STEP 4: Find PDF Download ===');
        const pdfResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              const pdfElements = [];
              
              // Look for buttons/links with PDF-related text
              const allElements = document.querySelectorAll('a, button, input[type="submit"], input[type="button"]');
              
              for (let element of allElements) {
                const text = element.textContent || element.value || '';
                const href = element.href || '';
                
                if (text.includes('PDF') || 
                    text.includes('Tisk') || 
                    text.includes('Download') || 
                    text.includes('Stáhnout') ||
                    text.includes('tisk') ||
                    href.includes('.pdf')) {
                  pdfElements.push({
                    tagName: element.tagName,
                    text: text.trim(),
                    href: href,
                    onclick: element.onclick ? element.onclick.toString() : '',
                    formAction: element.form ? element.form.action : ''
                  });
                }
              }
              
              return pdfElements;
            })();
          `,
          returnByValue: true
        });
        
        console.log('📄 PDF download elements:', JSON.stringify(pdfResult.result.value, null, 2));
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

testStep3PDF();