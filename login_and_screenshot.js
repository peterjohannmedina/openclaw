
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
    
    // Take a screenshot to verify login
    await page.screenshot({ path: 'airanger-loggedin.png' });
    
    console.log('Successfully logged in and took a screenshot.');
    
  } catch (error) {
    console.error('An error occurred:', error);
    await page.screenshot({ path: 'airanger-login-error.png' });
  } finally {
    await browser.close();
  }
})();
