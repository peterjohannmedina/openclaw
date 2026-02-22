
const { chromium } = require('playwright');
const { execSync } = require('child_process');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://bot.airanger.dev', { waitUntil: 'networkidle' });
    
    await page.fill('#loginEmail', 'admin@openclawbot.dev');
    await page.fill('#loginPassword', 'OpenClawR430_Moltbook!2026');
    await page.click('#signInBtn');
    await page.waitForTimeout(3000);

    // Get the Supabase session from local storage
    const supabaseSession = await page.evaluate(() => {
      const sessionKey = Object.keys(localStorage).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
      return sessionKey ? JSON.parse(localStorage.getItem(sessionKey)) : null;
    });

    if (!supabaseSession || !supabaseSession.access_token) {
      throw new Error('Could not retrieve Supabase access token.');
    }

    const accessToken = supabaseSession.access_token;

    // Use mcporter to update the profile
    const mcporterCommand = [
      '/home/rm/.npm-global/bin/mcporter',
      'call',
      '--method PUT',
      `--header "Authorization: Bearer ${accessToken}"`,
      'https://bot.airanger.dev/api/bot/profile',
      '--args \'{ "username": "OpenClawA_rm", "full_name": "OpenClaw Admin Robot" }\''
    ].join(' ');

    execSync(mcporterCommand, { stdio: 'inherit' });

    console.log('Successfully updated profile with mcporter. Now fetching models...');

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
