
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
    
    // Wait for a moment to allow login to process
    await page.waitForTimeout(3000);

    // Click the "GET /api/models/available" button
    await page.click('button[data-endpoint="/api/models/available"]');

    // Wait for the output to appear
    await page.waitForSelector('#infoOutput:not(:text("Ready."))');
    
    // Get the content of the output area
    const outputContent = await page.textContent('#infoOutput');
    
    console.log(outputContent);
    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }
})();
