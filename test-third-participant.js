import CDP from 'chrome-remote-interface';

async function testThirdParticipant() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Get third participant (Beata)
    console.log('=== GETTING THIRD PARTICIPANT (Beata) ===');
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
          
          // Return third participant (index 2)
          return participants.length > 2 ? participants[2] : null;
        })();
      `,
      returnByValue: true
    });
    
    console.log('👤 Third participant:', JSON.stringify(participantResult.result.value, null, 2));
    
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
        await new Promise(resolve => setTimeout(resolve, 6000));
        
        console.log('\n=== CLICKING PDF DOWNLOAD ===');
        const pdfClickResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              const button = document.getElementById('_TiskDoPdf');
              if (button && !button.disabled) {
                button.click();
                return { clicked: true, buttonText: button.textContent.trim() };
              }
              return { clicked: false };
            })();
          `,
          returnByValue: true
        });
        
        console.log('🖱️ PDF button click:', JSON.stringify(pdfClickResult.result.value, null, 2));
        
        if (pdfClickResult.result.value.clicked) {
          console.log('⏳ Waiting for PDF download...');
          await new Promise(resolve => setTimeout(resolve, 7000));
          
          console.log('\n=== CLICKING ZPĚT BUTTON ===');
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
            console.log('⏳ Waiting for return to project detail...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            
            // Verify we're back and participants are visible
            const finalCheck = await client.Runtime.evaluate({
              expression: `
                (function() {
                  const currentUrl = window.location.href;
                  const links = document.querySelectorAll('a[href*="PodporenaOsobaProjektuDetailPage"]');
                  let seenIds = new Set();
                  
                  for (let link of links) {
                    const match = link.href.match(/podporenaOsobaProjektuId=(\\d+)/);
                    if (match && link.textContent.trim().length > 1) {
                      seenIds.add(match[1]);
                    }
                  }
                  
                  return {
                    url: currentUrl,
                    participantCount: seenIds.size,
                    isOnProjectDetail: currentUrl.includes('ProjektDetailPage')
                  };
                })();
              `,
              returnByValue: true
            });
            
            console.log('✅ Final check:', JSON.stringify(finalCheck.result.value, null, 2));
            
            if (finalCheck.result.value.isOnProjectDetail && finalCheck.result.value.participantCount > 0) {
              console.log(`🎉 SUCCESS! Complete cycle worked for ${participant.name}`);
              console.log(`📊 Ready to continue with ${finalCheck.result.value.participantCount} participants visible`);
            }
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

testThirdParticipant();