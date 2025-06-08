import CDP from 'chrome-remote-interface';

async function stepByStepTest() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    console.log('✅ Connected to Chrome');
    
    // STEP 1: Check current state
    console.log('\n=== STEP 1: Current State ===');
    const urlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 Current URL:', urlResult.result.value);
    
    const titleResult = await client.Runtime.evaluate({
      expression: 'document.title',
      returnByValue: true
    });
    console.log('📄 Page title:', titleResult.result.value);
    
    // STEP 2: Extract form state
    console.log('\n=== STEP 2: Extract Form State ===');
    const stateResult = await client.Runtime.evaluate({
      expression: `
        const viewState = document.querySelector('input[name="__VIEWSTATE"]');
        const eventValidation = document.querySelector('input[name="__EVENTVALIDATION"]');
        ({
          hasViewState: !!viewState,
          hasEventValidation: !!eventValidation,
          viewStateLength: viewState ? viewState.value.length : 0
        });
      `,
      returnByValue: true
    });
    console.log('📝 Form state:', JSON.stringify(stateResult.result.value, null, 2));
    
    // STEP 3: Find project 2799 and its detail link
    console.log('\n=== STEP 3: Find Project 2799 Detail Link ===');
    const projectResult = await client.Runtime.evaluate({
      expression: `
        const rows = document.querySelectorAll('tr, td');
        let projectInfo = null;
        
        for (let element of rows) {
          const text = element.textContent || '';
          if (text.includes('2799')) {
            const links = element.querySelectorAll('a[href*="ProjektDetailPage"]');
            if (links.length > 0) {
              projectInfo = {
                text: text.trim().substring(0, 100),
                detailUrl: links[0].href,
                linkText: links[0].textContent.trim()
              };
              break;
            }
          }
        }
        projectInfo;
      `,
      returnByValue: true
    });
    console.log('🔍 Project 2799 info:', JSON.stringify(projectResult.result.value, null, 2));
    
    if (!projectResult.result.value) {
      console.log('❌ Project 2799 detail link not found!');
      return;
    }
    
    // STEP 4: Click on project detail link
    console.log('\n=== STEP 4: Click Project Detail Link ===');
    const clickResult = await client.Runtime.evaluate({
      expression: `
        const rows = document.querySelectorAll('tr, td');
        let clicked = false;
        
        for (let element of rows) {
          const text = element.textContent || '';
          if (text.includes('2799')) {
            const links = element.querySelectorAll('a[href*="ProjektDetailPage"]');
            if (links.length > 0) {
              links[0].click();
              clicked = true;
              break;
            }
          }
        }
        clicked;
      `,
      returnByValue: true
    });
    
    console.log('🖱️ Click result:', clickResult.result.value);
    
    if (!clickResult.result.value) {
      console.log('❌ Failed to click project detail link!');
      return;
    }
    
    // Wait for page load
    console.log('⏳ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // STEP 5: Check new page
    console.log('\n=== STEP 5: Check Project Detail Page ===');
    const newUrlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 New URL:', newUrlResult.result.value);
    
    const newTitleResult = await client.Runtime.evaluate({
      expression: 'document.title',
      returnByValue: true
    });
    console.log('📄 New title:', newTitleResult.result.value);
    
    // STEP 6: Look for "Seznam podpořených osob" link
    console.log('\n=== STEP 6: Find Support Persons Link ===');
    const supportResult = await client.Runtime.evaluate({
      expression: `
        const links = document.querySelectorAll('a');
        const supportLinks = [];
        
        for (let link of links) {
          const text = link.textContent || '';
          const href = link.href || '';
          if (text.includes('Seznam podpořených osob') || 
              text.includes('podpořených osob') ||
              href.includes('PodporenaOsobaSeznamPage')) {
            supportLinks.push({
              text: text.trim(),
              href: href
            });
          }
        }
        supportLinks;
      `,
      returnByValue: true
    });
    console.log('👥 Support links found:', JSON.stringify(supportResult.result.value, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

stepByStepTest();