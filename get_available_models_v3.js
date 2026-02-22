
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://bot.airanger.dev', { waitUntil: 'networkidle' });
    
    await page.fill('#loginEmail', 'admin@openclawbot.dev');
    await page.fill('#loginPassword', 'OpenClawR430_Moltbook!2026');
    await page.click('#signInBtn');
    
    await page.waitForTimeout(3000);

    await page.click('button[data-endpoint="/api/models/available"]');

    await page.waitForFunction(() => {
        const outputElement = document.querySelector('#infoOutput');
        return outputElement && outputElement.textContent.trim() !== 'Ready.' && outputElement.textContent.trim() !== 'Signed in.';
    }, null, { timeout: 10000 });

    const outputContent = await page.textContent('#infoOutput');
    
    console.log(outputContent);
    
    await page.screenshot({ path: 'airanger-models-output-v3.png' });
    
  } catch (error) {
    console.error('An error occurred:', error);
    await page.screenshot({ path: 'airanger-models-error-v3.png' });
  } finally {
    await browser.close();
  }
})();
