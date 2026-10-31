import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';

const base = 'https://www.elevate360official.com';
const browser = await chromium.launch({headless:true});
const results = [];
async function step(name, fn) {
  const start = Date.now();
  try { await fn(); results.push({name, status:'PASS', elapsedMs:Date.now()-start}); }
  catch(e) { results.push({name,status:'FAIL',error:String(e.message||e).slice(0,650)}); }
}
async function ready(page,url,testid) {
  const res=await page.goto(base+url,{waitUntil:'domcontentloaded',timeout:30000});
  assert.equal(res?.status(),200,url+' http status');
  await page.getByTestId(testid).waitFor({state:'visible',timeout:20000});
}
try {
  const desktop=await browser.newPage({viewport:{width:1440,height:900},locale:'en-US'});
  // Real browsing only. Abort analytics writes and all known checkout/form POSTs.
  await desktop.route('**/*', async route => {
    const req=route.request();
    if(req.method()!=='GET' && req.method()!=='HEAD') return route.abort();
    return route.continue();
  });
  await step('Desktop homepage and booking navigation',async()=>{
    await ready(desktop,'/','link-nav-book');
    assert.equal(await desktop.getByTestId('link-nav-book').getAttribute('href'),'/strategy-session');
    await desktop.getByTestId('link-nav-book').click();
    await desktop.waitForURL('**/strategy-session',{timeout:10000});
  });
  await step('Desktop FAQ opens contact dialog without submission',async()=>{
    await ready(desktop,'/','faq-contact-link');
    await desktop.getByTestId('faq-contact-link').click();
    await desktop.getByRole('dialog').getByText('Get in Touch').waitFor({timeout:7000});
    await desktop.getByTestId('input-contact-email').waitFor();
    await desktop.keyboard.press('Escape');
  });
  await step('Work contact CTA opens contact dialog',async()=>{
    await ready(desktop,'/work','button-work-contact');
    await desktop.getByTestId('button-work-contact').click();
    await desktop.getByRole('dialog').getByText('Get in Touch').waitFor({timeout:7000});
    await desktop.keyboard.press('Escape');
  });
  await step('Work strategy CTA links to session page',async()=>{
    await ready(desktop,'/work','button-work-discuss');
    await desktop.getByTestId('button-work-discuss').click();
    await desktop.waitForURL('**/strategy-session',{timeout:10000});
  });
  await step('Newsletter email field has accessible label',async()=>{
    await ready(desktop,'/','link-nav-logo');
    const field=desktop.getByRole('textbox',{name:'Email address for newsletter updates'});
    assert.ok(await field.count()>0,'missing accessible newsletter label');
  });
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,deviceScaleFactor:3});
  await mobile.route('**/*', async route => {
    const req=route.request();
    if(req.method()!=='GET' && req.method()!=='HEAD') return route.abort();
    return route.continue();
  });
  await step('Mobile menu opens and booking route navigates',async()=>{
    await ready(mobile,'/','button-mobile-menu');
    await mobile.getByTestId('button-mobile-menu').click();
    await mobile.getByTestId('link-mobile-nav-book-a-session').waitFor({state:'visible',timeout:7000});
    await mobile.getByTestId('link-mobile-nav-book-a-session').click();
    await mobile.waitForURL('**/strategy-session',{timeout:10000});
  });
  await step('Mobile homepage does not overflow viewport',async()=>{
    await ready(mobile,'/','button-mobile-menu');
    const dims=await mobile.evaluate(()=>({width:document.documentElement.scrollWidth, viewport:window.innerWidth}));
    assert.ok(dims.width<=dims.viewport+3,JSON.stringify(dims));
  });
  await desktop.close();await mobile.close();
} finally {await browser.close()}
console.log(JSON.stringify({host:base,date:new Date().toISOString(),mode:'post-Zod-4-release browser verification; writes blocked',checks:results},null,2));
if(results.some(r=>r.status==='FAIL'))process.exitCode=1;
