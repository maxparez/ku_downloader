import CDP from 'chrome-remote-interface';

async function testPDFDownload() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Verify we're on participant detail page
    const urlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 Current URL:', urlResult.result.value);
    
    if (!urlResult.result.value.includes('PodporenaOsobaProjektuDetailPage')) {
      console.log('❌ Not on participant detail page');
      return;
    }
    
    // Get participant name from page
    const nameResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const title = document.title;
          const heading = document.querySelector('h1, h2, .page-title');
          return {
            title: title,
            heading: heading ? heading.textContent.trim() : 'N/A'
          };
        })();
      `,
      returnByValue: true
    });
    console.log('👤 Participant info:', JSON.stringify(nameResult.result.value, null, 2));
    
    // Check if PDF button exists and is clickable
    console.log('\n=== CHECKING PDF BUTTON ===');
    const buttonCheckResult = await client.Runtime.evaluate({
      expression: `
        (function() {
          const button = document.getElementById('_TiskDoPdf');
          if (button) {
            return {
              exists: true,
              text: button.textContent.trim(),
              disabled: button.disabled,
              visible: window.getComputedStyle(button).display !== 'none',
              onclick: button.onclick ? 'has onclick' : 'no onclick'
            };
          }
          return { exists: false };
        })();
      `,
      returnByValue: true
    });
    
    console.log('🔘 PDF button status:', JSON.stringify(buttonCheckResult.result.value, null, 2));
    
    if (buttonCheckResult.result.value.exists && !buttonCheckResult.result.value.disabled) {
      console.log('\n=== CLICKING PDF DOWNLOAD BUTTON ===');
      
      // Enable Page domain to monitor downloads
      await client.Page.enable();
      
      // Set up download monitoring
      console.log('📥 Setting up download monitoring...');
      
      // Click the PDF button
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
      
      console.log('🖱️ PDF button click:', clickResult.result.value);
      
      if (clickResult.result.value) {
        console.log('⏳ Waiting for PDF download response...');
        await new Promise(resolve => setTimeout(resolve, 8000));
        
        // Check if anything happened
        const afterClickResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              return {
                currentUrl: window.location.href,
                title: document.title,
                hasNewWindow: window.open !== window.open,
                timestamp: Date.now()
              };
            })();
          `,
          returnByValue: true
        });
        
        console.log('📊 After click status:', JSON.stringify(afterClickResult.result.value, null, 2));
        
        // Check if we have any new downloads or file dialogs
        console.log('\n=== CHECKING FOR DOWNLOAD OR NEW CONTENT ===');
        
        // Look for any download links or new content that might have appeared
        const downloadCheckResult = await client.Runtime.evaluate({
          expression: `
            (function() {
              // Check for any new links with blob: or data: URLs
              const links = document.querySelectorAll('a[href^="blob:"], a[href^="data:"], a[download]');
              const linkInfo = [];
              
              for (let link of links) {
                linkInfo.push({
                  href: link.href.substring(0, 100) + (link.href.length > 100 ? '...' : ''),
                  download: link.download,
                  text: link.textContent.trim()
                });
              }
              
              // Check for any new iframes or windows
              const iframes = document.querySelectorAll('iframe');
              const iframeInfo = [];
              
              for (let iframe of iframes) {
                if (iframe.src) {
                  iframeInfo.push({
                    src: iframe.src.substring(0, 100) + (iframe.src.length > 100 ? '...' : ''),
                    width: iframe.width,
                    height: iframe.height
                  });
                }
              }
              
              return {
                downloadLinks: linkInfo,
                iframes: iframeInfo,
                totalLinks: links.length,
                totalIframes: iframes.length
              };
            })();
          `,
          returnByValue: true
        });
        
        console.log('📥 Download check:', JSON.stringify(downloadCheckResult.result.value, null, 2));
      }
    } else {
      console.log('❌ PDF button not available for clicking');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

testPDFDownload();