import CDP from 'chrome-remote-interface';

async function testParticipantPDF() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Get first participant
    console.log('\n=== GETTING FIRST PARTICIPANT ===');
    const participantResult = await client.Runtime.evaluate({
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
              return {
                id: match[1],
                name: text,
                url: href
              };
            }
          }
          
          return null;
        })();
      `,
      returnByValue: true
    });
    
    console.log('👤 First participant:', JSON.stringify(participantResult.result.value, null, 2));
    
    if (participantResult.result.value) {
      const participant = participantResult.result.value;
      
      console.log(`\\n=== CLICKING ON ${participant.name} ===`);
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
        console.log('📍 Participant detail URL:', newUrlResult.result.value);
        
        // Look for PDF download options
        console.log('\\n=== LOOKING FOR PDF DOWNLOAD ===');
        const pdfResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              const pdfElements = [];
              
              // Look for any elements with PDF-related text
              const allElements = document.querySelectorAll('*');
              
              for (let element of allElements) {
                const text = element.textContent || element.value || '';
                const tagName = element.tagName;
                
                if ((text.includes('PDF') || 
                     text.includes('Tisk') || 
                     text.includes('tisk') ||
                     text.includes('Download') || 
                     text.includes('Stáhnout')) && 
                    text.length < 100) {
                  
                  pdfElements.push({
                    tagName: tagName,
                    text: text.trim(),
                    id: element.id,
                    className: element.className,
                    onclick: element.onclick ? 'has onclick' : 'no onclick',
                    href: element.href || 'no href'
                  });
                }
              }
              
              return pdfElements;
            })();
          `,
          returnByValue: true
        });
        
        console.log('📄 PDF-related elements:', JSON.stringify(pdfResult.result.value, null, 2));
        
        // Look specifically for forms and buttons
        console.log('\\n=== LOOKING FOR FORMS AND BUTTONS ===');
        const formsResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              const elements = [];
              
              // Check forms
              const forms = document.querySelectorAll('form');
              for (let form of forms) {
                elements.push({
                  type: 'FORM',
                  action: form.action,
                  method: form.method,
                  id: form.id
                });
              }
              
              // Check buttons and inputs
              const buttons = document.querySelectorAll('button, input[type="submit"], input[type="button"]');
              for (let button of buttons) {
                const text = button.textContent || button.value || '';
                if (text.length > 0) {
                  elements.push({
                    type: button.tagName,
                    text: text.trim(),
                    name: button.name,
                    value: button.value,
                    onclick: button.onclick ? 'has onclick' : 'no onclick'
                  });
                }
              }
              
              return elements;
            })();
          `,
          returnByValue: true
        });
        
        console.log('🔘 Forms and buttons:', JSON.stringify(formsResult.result.value, null, 2));
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

testParticipantPDF();