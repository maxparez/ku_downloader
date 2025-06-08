import CDP from 'chrome-remote-interface';

async function debugESF() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    console.log('✅ Connected to Chrome');
    
    // Get current URL
    const urlResult = await client.Runtime.evaluate({
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('📍 Current URL:', urlResult.result.value);
    
    // Get page title
    const titleResult = await client.Runtime.evaluate({
      expression: 'document.title',
      returnByValue: true
    });
    console.log('📄 Page title:', titleResult.result.value);
    
    // Check for project filter input
    const filterResult = await client.Runtime.evaluate({
      expression: `
        const inputs = document.querySelectorAll('input[type="text"]');
        const filterInputs = [];
        for (let input of inputs) {
          if (input.name && (input.name.includes('DXFREditorcol') || input.name.includes('projekt'))) {
            filterInputs.push({
              name: input.name,
              id: input.id,
              value: input.value,
              placeholder: input.placeholder
            });
          }
        }
        filterInputs;
      `,
      returnByValue: true
    });
    console.log('🔍 Filter inputs found:', JSON.stringify(filterResult.result.value, null, 2));
    
    // Check for form state
    const stateResult = await client.Runtime.evaluate({
      expression: `
        const viewState = document.getElementById('__VIEWSTATE');
        const eventValidation = document.getElementById('__EVENTVALIDATION');
        ({
          hasViewState: !!viewState,
          hasEventValidation: !!eventValidation,
          viewStateLength: viewState ? viewState.value.length : 0
        });
      `,
      returnByValue: true
    });
    console.log('📝 Form state:', JSON.stringify(stateResult.result.value, null, 2));
    
    // Look for links that might lead to project detail
    const linksResult = await client.Runtime.evaluate({
      expression: `
        const links = document.querySelectorAll('a');
        const projectLinks = [];
        for (let link of links) {
          const text = link.textContent || '';
          const href = link.href || '';
          if (text.includes('2799') || href.includes('2799') || 
              text.includes('Podpořené') || text.includes('Detail')) {
            projectLinks.push({
              text: text.trim().substring(0, 50),
              href: href.substring(0, 100)
            });
          }
        }
        projectLinks.slice(0, 5); // Show first 5 matches
      `,
      returnByValue: true
    });
    console.log('🔗 Relevant links found:', JSON.stringify(linksResult.result.value, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

debugESF();