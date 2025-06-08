import CDP from 'chrome-remote-interface';

async function debugESF2() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Check for form state properly  
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
    console.log('📝 Form state (fixed):', JSON.stringify(stateResult.result.value, null, 2));
    
    // Look for project rows/cells with 2799
    const rowsResult = await client.Runtime.evaluate({
      expression: `
        const rows = document.querySelectorAll('tr, td');
        const project2799Rows = [];
        for (let element of rows) {
          const text = element.textContent || '';
          if (text.includes('2799')) {
            const links = element.querySelectorAll('a');
            project2799Rows.push({
              text: text.trim().substring(0, 80),
              hasLinks: links.length > 0,
              linkHrefs: Array.from(links).map(a => a.href).slice(0, 2)
            });
          }
        }
        project2799Rows.slice(0, 3);
      `,
      returnByValue: true
    });
    console.log('📋 Project 2799 rows found:', JSON.stringify(rowsResult.result.value, null, 2));
    
    // Look for "Podpořené osoby" links specifically
    const supportLinksResult = await client.Runtime.evaluate({
      expression: `
        const allLinks = document.querySelectorAll('a, button');
        const supportLinks = [];
        for (let link of allLinks) {
          const text = link.textContent || '';
          const href = link.href || '';
          if (text.includes('Podpořené') || text.includes('osoby') || 
              text.includes('Účastníci') || text.includes('Participant') ||
              href.includes('PodporenaOsoba') || href.includes('participant')) {
            supportLinks.push({
              text: text.trim().substring(0, 50),
              href: href.substring(0, 80),
              tagName: link.tagName
            });
          }
        }
        supportLinks.slice(0, 5);
      `,
      returnByValue: true
    });
    console.log('👥 Support persons links:', JSON.stringify(supportLinksResult.result.value, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

debugESF2();