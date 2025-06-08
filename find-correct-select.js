import CDP from 'chrome-remote-interface';

async function findCorrectSelect() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Find the correct select with specific onchange handler
    console.log('\n=== FINDING CORRECT SELECT FOR PODPORENE OSOBY ===');
    const selectResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const selects = document.querySelectorAll('select.acgp-pageSize');
          
          for (let select of selects) {
            const onchangeAttr = select.getAttribute('onchange');
            if (onchangeAttr && onchangeAttr.includes('PodporeneOsobyInfos')) {
              return {
                found: true,
                onchange: onchangeAttr,
                currentValue: select.value,
                options: Array.from(select.options).map(opt => ({
                  value: opt.value,
                  text: opt.textContent,
                  selected: opt.selected
                }))
              };
            }
          }
          
          return { found: false };
        })();
      `,
      returnByValue: true
    });
    
    console.log('🎯 Correct select:', JSON.stringify(selectResult.result.value, null, 2));
    
    if (selectResult.result.value.found) {
      console.log('\n=== CHANGING CORRECT SELECT TO 50 ===');
      const changeResult = await client.Runtime.evaluate({
        expression: `
          (function() {
            const selects = document.querySelectorAll('select.acgp-pageSize');
            
            for (let select of selects) {
              const onchangeAttr = select.getAttribute('onchange');
              if (onchangeAttr && onchangeAttr.includes('PodporeneOsobyInfos')) {
                // Set to 50
                select.value = '50';
                
                // Trigger the actual onchange handler
                if (select.onchange) {
                  select.onchange();
                } else {
                  // Manually execute the onchange code
                  if (window.projektDetailTabs_PodporeneOsobyInfos && 
                      window.projektDetailTabs_PodporeneOsobyInfos.PerformCallback) {
                    window.projektDetailTabs_PodporeneOsobyInfos.PerformCallback('pageSize=50');
                  }
                }
                
                return {
                  success: true,
                  newValue: select.value
                };
              }
            }
            
            return { success: false };
          })();
        `,
        returnByValue: true
      });
      
      console.log('📊 Change result:', JSON.stringify(changeResult.result.value, null, 2));
      
      if (changeResult.result.value.success) {
        console.log('⏳ Waiting for AJAX callback to complete...');
        await new Promise(resolve => setTimeout(resolve, 10000));
        
        // Check participants count
        const countResult = await client.Runtime.evaluate({
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
                    name: text
                  });
                }
              }
              
              return {
                totalLinks: links.length,
                uniqueParticipants: participants.length,
                participants: participants
              };
            })();
          `,
          returnByValue: true
        });
        
        console.log('👥 Final participants count:', JSON.stringify(countResult.result.value, null, 2));
        console.log(`✅ Now showing ${countResult.result.value.uniqueParticipants} unique participants!`);
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

findCorrectSelect();