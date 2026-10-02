import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
process.env.PLAYWRIGHT_BROWSERS_PATH = path.resolve('node_modules/.cache/playwright');
const { chromium } = await import('playwright');
const browser = await chromium.launch();
const failures=[];
try {
  for(const [device,viewport] of [['desktop',{width:1350,height:900}],['mobile',{width:393,height:851}]]) {
    const context=await browser.newContext({viewport,hasTouch:device==='mobile',isMobile:device==='mobile'});
    const page=await context.newPage();
    page.on('pageerror',error=>failures.push(`${device}: ${error.message}`));
    await page.goto('http://127.0.0.1:4173/');
    await page.getByRole('heading',{level:1,name:'Ideas into code. Code into impact.'}).waitFor();
    await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.dot-grid__canvas').first().evaluate(canvas=>canvas.style.opacity), '0', 'Canvas should not initialize before interaction');
    await page.screenshot({path:`artifacts/pagespeed/${device}-intro.png`});
    if(device==='desktop') {
      await page.mouse.move(900,450);
      assert.equal(await page.locator('.intro-orbit-dots canvas').evaluate(canvas=>canvas.style.opacity),'1','Interactive dots should activate on mouse movement');
    }
    const scripts=await page.evaluate(()=>performance.getEntriesByType('resource').map(entry=>entry.name).filter(name=>name.endsWith('.js')));
    assert(!scripts.some(name=>/PortfolioApp|Playground|PortfolioAI|HomeTour/.test(name)),'Heavy portfolio code loaded before entering');
    await page.getByRole('button',{name:'Enter Portfolio'}).click();
    await page.getByRole('heading',{level:1,name:'Building thoughtful digital experiences.'}).waitFor();
    await page.getByRole('button',{name:'Skip tour',exact:true}).click();
    await page.screenshot({path:`artifacts/pagespeed/${device}-home.png`});
    await page.getByRole('link',{name:'View projects',exact:false}).first().click();
    await page.getByRole('heading',{level:1,name:'Projects.'}).waitFor();
    assert.equal(await page.evaluate(()=>document.activeElement?.tagName),'H1');
    await page.goBack();
    await page.getByRole('heading',{level:1,name:'Building thoughtful digital experiences.'}).waitFor();
    for(const [route,heading] of [['experience','Experience.'],['stack','Stack.'],['certifications','Certifications.'],['contact','Let’s build something.'],['playground','Playground.'],['ask','Ask anything.'],['typing-test','Typing test.']]) {
      await page.goto(`http://127.0.0.1:4173/${route}`);
      await page.getByRole('heading',{level:1,name:heading}).waitFor();
      const broken=await page.locator('img').evaluateAll(images=>images.filter(img=>img.complete&&img.naturalWidth===0).map(img=>img.src));
      assert.deepEqual(broken,[],`${device}/${route}: broken image`);
    }
    await context.close();
    console.log(`${device}: intro, deferred chunks, opening animation, tour, navigation, focus, back button and 8 routes passed`);
  }
  assert.deepEqual(failures,[]);
} finally {await browser.close();}
