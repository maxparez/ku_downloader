import CDP from 'chrome-remote-interface';

async function debugDeeper() {
  let client;
  try {
    console.log('🔗 Connecting to Chrome...');
    client = await CDP({ port: 9222 });
    
    // Check all elements containing 2799
    console.log('\n=== ALL ELEMENTS WITH 2799 ===');
    const allResult = await client.Runtime.evaluate({
      expression: `
        const allElements = document.querySelectorAll('*');
        const with2799 = [];
        
        for (let el of allElements) {
          const text = el.textContent || '';
          if (text.includes('2799') && text.length < 300) {
            with2799.push({
              tagName: el.tagName,
              className: el.className,
              text: text.trim().substring(0, 150),
              hasLinks: el.querySelectorAll('a').length > 0,
              innerHTML: el.innerHTML.substring(0, 200)
            });
          }
        }
        with2799.slice(0, 10);
      `,
      returnByValue: true
    });
    console.log('Elements with 2799:', JSON.stringify(allResult.result.value, null, 2));
    
    // Check specifically for links
    console.log('\n=== ALL LINKS ON PAGE ===');
    const linksResult = await client.Runtime.evaluate({
      expression: `
        const links = document.querySelectorAll('a');
        const linkInfo = [];
        
        for (let link of links) {
          const text = link.textContent || '';
          const href = link.href || '';
          if (href.includes('ProjektDetailPage') || text.includes('2799')) {
            linkInfo.push({
              text: text.trim().substring(0, 80),
              href: href
            });
          }
        }
        linkInfo.slice(0, 10);
      `,
      returnByValue: true
    });
    console.log('Relevant links:', JSON.stringify(linksResult.result.value, null, 2));
    
    // Check form inputs again
    console.log('\n=== FORM STATE DEBUG ===');
    const formResult = await client.Runtime.evaluate({
      expression: `
        const allInputs = document.querySelectorAll('input');
        const inputInfo = [];
        
        for (let input of allInputs) {
          if (input.name && (input.name.includes('VIEWSTATE') || input.name.includes('VALIDATION'))) {
            inputInfo.push({
              name: input.name,
              type: input.type,
              hasValue: !!input.value,
              valueLength: input.value ? input.value.length : 0
            });
          }
        }
        inputInfo;
      `,
      returnByValue: true
    });
    console.log('Form inputs:', JSON.stringify(formResult.result.value, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    if (client) {
      await client.close();
    }
  }
}

debugDeeper();