import CDP from 'chrome-remote-interface';

async function analyzePDFUrl() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Enable necessary domains
    await client.Network.enable();
    await client.Page.enable();
    
    // Setup network monitoring
    const networkRequests = [];
    
    client.Network.requestWillBeSent((params) => {
      networkRequests.push({
        requestId: params.requestId,
        url: params.request.url,
        method: params.request.method,
        headers: params.request.headers,
        postData: params.request.postData,
        timestamp: params.timestamp
      });
    });
    
    client.Network.responseReceived((params) => {
      const request = networkRequests.find(r => r.requestId === params.requestId);
      if (request) {
        request.response = {
          status: params.response.status,
          statusText: params.response.statusText,
          headers: params.response.headers,
          mimeType: params.response.mimeType
        };
      }
    });
    
    console.log('📡 Network monitoring enabled');
    
    // Get fifth participant URL for testing
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
          
          // Return fifth participant (index 4)
          return participants.length > 4 ? participants[4] : null;
        })();
      `,
      returnByValue: true
    });
    
    console.log('👤 Test participant:', JSON.stringify(participantResult.result.value, null, 2));
    
    if (participantResult.result.value) {
      const participant = participantResult.result.value;
      
      console.log(`\n=== NAVIGATING TO ${participant.name} FOR PDF URL ANALYSIS ===`);
      
      // Navigate to participant detail
      await client.Runtime.evaluate({
        expression: `window.location.href = '${participant.url}';`,
        returnByValue: true
      });
      
      await new Promise(resolve => setTimeout(resolve, 6000));
      
      // Clear previous network requests
      networkRequests.length = 0;
      
      console.log('\n=== ANALYZING PDF BUTTON BEFORE CLICK ===');
      
      // Look for any existing PDF URLs or form data
      const preClickAnalysis = await client.Runtime.evaluate({
        expression: `
          (function() {
            const button = document.getElementById('_TiskDoPdf');
            const form = document.forms[0];
            
            // Check form action and hidden fields
            const hiddenInputs = {};
            if (form) {
              const inputs = form.querySelectorAll('input[type="hidden"]');
              for (let input of inputs) {
                if (input.name === '__VIEWSTATE' || input.name === '__EVENTVALIDATION' || input.name === '__EVENTTARGET') {
                  hiddenInputs[input.name] = input.value.length > 50 ? 
                    input.value.substring(0, 50) + '...[' + input.value.length + ' chars]' : 
                    input.value;
                }
              }
            }
            
            // Look for any existing PDF links or patterns
            const pdfLinks = [];
            const allLinks = document.querySelectorAll('a');
            for (let link of allLinks) {
              if (link.href.includes('pdf') || link.href.includes('PDF') || 
                  link.textContent.includes('PDF') || link.textContent.includes('pdf')) {
                pdfLinks.push({
                  href: link.href,
                  text: link.textContent.trim()
                });
              }
            }
            
            return {
              buttonExists: !!button,
              buttonOnclick: button ? (button.onclick ? 'has onclick' : 'no onclick') : 'no button',
              formAction: form ? form.action : 'no form',
              formMethod: form ? form.method : 'no form',
              hiddenInputs: hiddenInputs,
              pdfLinks: pdfLinks,
              participantId: window.location.href.match(/podporenaOsobaProjektuId=(\\d+)/) ? 
                           window.location.href.match(/podporenaOsobaProjektuId=(\\d+)/)[1] : null
            };
          })();
        `,
        returnByValue: true
      });
      
      console.log('🔍 Pre-click analysis:', JSON.stringify(preClickAnalysis.result.value, null, 2));
      
      console.log('\n=== CLICKING PDF BUTTON AND MONITORING NETWORK ===');
      
      // Click PDF button
      const clickResult = await client.Runtime.evaluate({
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
      
      console.log('🖱️ PDF button clicked:', clickResult.result.value);
      
      if (clickResult.result.value) {
        console.log('⏳ Waiting and monitoring network requests...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Analyze captured network requests
        console.log('\n=== NETWORK TRAFFIC ANALYSIS ===');
        
        const pdfRequests = networkRequests.filter(req => 
          req.url.includes('pdf') || req.url.includes('PDF') ||
          (req.response && req.response.mimeType && req.response.mimeType.includes('pdf')) ||
          req.url.includes('Tisk') || req.url.includes('Download')
        );
        
        const postRequests = networkRequests.filter(req => req.method === 'POST');
        
        console.log(`📊 Total network requests: ${networkRequests.length}`);
        console.log(`📄 PDF-related requests: ${pdfRequests.length}`);
        console.log(`📮 POST requests: ${postRequests.length}`);
        
        if (pdfRequests.length > 0) {
          console.log('\n🎯 PDF-RELATED REQUESTS:');
          pdfRequests.forEach((req, index) => {
            console.log(`${index + 1}. URL: ${req.url}`);
            console.log(`   Method: ${req.method}`);
            if (req.response) {
              console.log(`   Status: ${req.response.status}`);
              console.log(`   MIME: ${req.response.mimeType}`);
            }
            if (req.postData) {
              console.log(`   POST Data: ${req.postData.substring(0, 200)}...`);
            }
            console.log('');
          });
        }
        
        if (postRequests.length > 0) {
          console.log('\n📮 POST REQUESTS:');
          postRequests.forEach((req, index) => {
            console.log(`${index + 1}. URL: ${req.url}`);
            if (req.postData) {
              // Look for patterns in POST data
              const postData = req.postData;
              console.log(`   Contains __EVENTTARGET: ${postData.includes('__EVENTTARGET')}`);
              console.log(`   Contains TiskDoPdf: ${postData.includes('TiskDoPdf')}`);
              console.log(`   Contains participant ID: ${postData.includes(participant.id)}`);
              
              if (postData.includes('__EVENTTARGET')) {
                const eventTargetMatch = postData.match(/__EVENTTARGET=([^&]+)/);
                if (eventTargetMatch) {
                  console.log(`   __EVENTTARGET value: ${decodeURIComponent(eventTargetMatch[1])}`);
                }
              }
            }
            console.log('');
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.Network.disable();
      await client.Page.disable();
      await client.close();
    }
  }
}

analyzePDFUrl();