
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://bot.airanger.dev', { waitUntil: 'networkidle' });
    
    // Fill the login form
    await page.fill('#loginEmail', 'admin@openclawbot.dev');
    await page.fill('#loginPassword', 'OpenClawR430_Moltbook!2026');
    
    // Click the sign-in button
    await page.click('#signInBtn');
    
    // Wait for a navigation or a specific element that confirms login
    await page.waitForTimeout(3000); // Wait for login to process

    // Click the "GET /api/models/available" button
    await page.click('button[data-endpoint="/api/models/available"]');

    // Wait for the output to appear by checking for changes in the text content
    await page.waitForFunction(() => {
        const outputElement = document.querySelector('#infoOutput');
        return outputElement && outputElement.textContent.trim() !== 'Ready.';
    }, null, { timeout: 10000 }); // Wait up to 10 seconds

    // Get the content of the output area
    const outputContent = await page.textContent('#infoOutput');
    
    console.log(outputContent);
    
    await page.screenshot({ path: 'airanger-models-output.png' });
    
  } catch (error) {
    console.error('An error occurred:', error);
    await page.screenshot({ path: 'airanger-models-error.png' });
  } finally {
    await browser.close();
  }
})();
