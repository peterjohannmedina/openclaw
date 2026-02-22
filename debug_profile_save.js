
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://bot.airanger.dev', { waitUntil: 'networkidle' });
    
    // Login
    await page.fill('#loginEmail', 'admin@openclawbot.dev');
    await page.fill('#loginPassword', 'OpenClawR430_Moltbook!2026');
    await page.click('#signInBtn');
    await page.waitForTimeout(3000); // Wait for login

    // Fill and save profile
    await page.fill('#profileUsername', 'OpenClawA_rm');
    await page.fill('#profileFullName', 'OpenClaw Admin Robot');
    await page.click('#saveProfileBtn');
    await page.waitForTimeout(2000); // Wait for save to process

    // Take a screenshot AFTER saving the profile
    await page.screenshot({ path: 'airanger-after-profile-save.png' });
    
    // Now, get available models
    await page.click('button[data-endpoint="/api/models/available"]');
    await page.waitForFunction(() => {
        const outputElement = document.querySelector('#infoOutput');
        return outputElement && outputElement.textContent.trim() !== 'Ready.' && outputElement.textContent.trim() !== 'Signed in.';
    }, null, { timeout: 10000 });

    const outputContent = await page.textContent('#infoOutput');
    console.log(outputContent);
    
  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    await browser.close();
  }
})();
