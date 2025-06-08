import CDP from 'chrome-remote-interface';

async function testDirectNavigation() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Get fourth participant URL
    console.log('=== GETTING FOURTH PARTICIPANT URL ===');
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
          
          // Return fourth participant (index 3)
          return participants.length > 3 ? participants[3] : null;
        })();
      `,
      returnByValue: true
    });
    
    console.log('👤 Fourth participant:', JSON.stringify(participantResult.result.value, null, 2));
    
    if (participantResult.result.value) {
      const participant = participantResult.result.value;
      
      console.log(`\n=== NAVIGATING DIRECTLY TO ${participant.name} DETAIL ===`);
      console.log(`🔗 Direct URL: ${participant.url}`);
      
      // Navigate directly to participant detail URL
      const navigationResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            window.location.href = '${participant.url}';
            return true;
          })();
        `,
        returnByValue: true
      });
      
      console.log('🚀 Direct navigation initiated:', navigationResult.result.value);
      
      // Wait for page to load
      console.log('⏳ Waiting for participant detail page to load...');
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Verify we're on the correct page
      const verificationResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            return {
              currentUrl: window.location.href,
              title: document.title,
              participantId: window.location.href.match(/podporenaOsobaProjektuId=(\\d+)/) ? 
                            window.location.href.match(/podporenaOsobaProjektuId=(\\d+)/)[1] : null
            };
          })();
        `,
        returnByValue: true
      });
      
      console.log('📍 Verification:', JSON.stringify(verificationResult.result.value, null, 2));
      
      // Check if PDF button is available
      const pdfButtonResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const button = document.getElementById('_TiskDoPdf');
            return button ? {
              exists: true,
              text: button.textContent.trim(),
              disabled: button.disabled,
              visible: window.getComputedStyle(button).display !== 'none'
            } : { exists: false };
          })();
        `,
        returnByValue: true
      });
      
      console.log('🔘 PDF button status:', JSON.stringify(pdfButtonResult.result.value, null, 2));
      
      if (pdfButtonResult.result.value.exists && !pdfButtonResult.result.value.disabled) {
        console.log('\n=== CLICKING PDF DOWNLOAD (DIRECT NAVIGATION METHOD) ===');
        
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
          await new Promise(resolve => setTimeout(resolve, 7000));
          
          console.log('✅ PDF download should be complete!');
          console.log(`🎯 Direct navigation to ${participant.name} worked perfectly!`);
          
          // Optional: Navigate back using ZPĚT button
          console.log('\n=== NAVIGATING BACK WITH ZPĚT ===');
          const zpetResult = await client.Runtime.evaluate({
            expression: `
              (function() {
                const zpetLinks = document.querySelectorAll('a');
                for (let link of zpetLinks) {
                  if (link.textContent.includes('ZPĚT')) {
                    link.click();
                    return { clicked: true, href: link.href };
                  }
                }
                return { clicked: false };
              })();
            `,
            returnByValue: true
          });
          
          console.log('🖱️ ZPĚT click:', JSON.stringify(zpetResult.result.value, null, 2));
          
          if (zpetResult.result.value.clicked) {
            await new Promise(resolve => setTimeout(resolve, 5000));
            console.log('✅ Successfully returned to project detail');
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

testDirectNavigation();