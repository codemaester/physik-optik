const assert = require('node:assert/strict');
const fs = require('node:fs');
const {join} = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const sourcePath = join(__dirname, '..', 'index.html');
const html = fs.readFileSync(sourcePath, 'utf8');
const fileUrl = pathToFileURL(sourcePath).href;
const screenshots = process.env.OPTIK_SCREENSHOTS;
if (screenshots) fs.mkdirSync(screenshots, {recursive:true});

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 1024, 900, 768, 390, 320]) {
      for (const colorScheme of ['light', 'dark']) {
        const page = await browser.newPage({viewport:{width,height:1000},colorScheme});
        const errors = [];
        page.on('pageerror', error => errors.push(error.message));
        await page.goto(fileUrl);
        assert.equal(await page.locator('.live-sim:visible').count(), 7);
        await page.keyboard.press('Tab');
        assert.ok(await page.locator('.skip-link').evaluate(el=>el===document.activeElement));
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(()=>document.activeElement.id), 'inhalt');
        assert.equal(await page.locator('.skip-link').evaluate(el=>getComputedStyle(el).clipPath), 'inset(50%)');
        const overflows = await page.evaluate(() => [...document.querySelectorAll('.metric small,.control-card label,h2,.table th,.chapter-head,.quiz-option label,.video-info')]
          .filter(el => el.clientWidth && el.scrollWidth > el.clientWidth + 1)
          .map(el=>({text:el.textContent.slice(0,60),client:el.clientWidth,scroll:el.scrollWidth})));
        assert.deepEqual(overflows, [], `${width}/${colorScheme}: content overflow`);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth > innerWidth), false);
        for (const svg of await page.locator('.live-sim svg').all()) assert.ok(await svg.getAttribute('aria-label'));
        for (const area of await page.locator('textarea').all()) {
          const id = await area.getAttribute('id');
          assert.equal(await page.locator(`label[for="${id}"]`).count(), 1);
        }
        await page.locator('#chapter-menu summary').click();
        await page.locator('.chapter-picker a[href="#k5"]').click();
        assert.equal(await page.evaluate(()=>document.activeElement.id), 'k5');
        assert.equal(await page.locator('#chapter-menu').getAttribute('open'), null);
        assert.ok(await page.locator('#k5').evaluate(el=>el.getBoundingClientRect().top >= 65));
        await page.locator('#chapter-menu summary').click();
        await page.keyboard.press('Escape');
        assert.ok(await page.locator('#chapter-menu summary').evaluate(el=>el===document.activeElement));
        const card = page.locator('#k1 .css-mcq').first();
        await card.locator('label').nth(0).click();
        assert.ok(await card.locator('.option-feedback.bad').first().isVisible());
        await card.locator('label').nth(1).click();
        assert.ok(await card.locator('.option-feedback.good').isVisible());
        assert.match(await page.locator('#k1 .quiz-score').textContent(), /1 von 15 beantwortet · 1 richtig/);
        await page.locator('#k1 .quiz-reset').click();
        assert.equal(await card.locator('input:checked').count(), 0);
        await page.locator('label[for="antwort-1"]').click();
        assert.equal(await page.evaluate(()=>document.activeElement.id), 'antwort-1');
        await page.locator('#s5height').focus();
        await page.keyboard.press('ArrowRight');
        assert.equal(await page.locator('#s5height').getAttribute('aria-valuetext'), '176 cm');
        await page.locator('#k5 .live-reset').click();
        assert.equal(await page.locator('#s5height').getAttribute('aria-valuetext'), '175 cm');
        if (screenshots && [1440,390].includes(width)) {
          await page.goto(fileUrl);
          await page.screenshot({path:join(screenshots, `page-${width}-${colorScheme}.png`)});
          await page.locator('#k5 .live-sim').scrollIntoViewIfNeeded();
          // Hide the sticky toolbar for isolated component captures only.
          await page.addStyleTag({content:'.toolbar{visibility:hidden}'});
          await page.locator('#k5 .live-sim').screenshot({path:join(screenshots, `simulation-${width}-${colorScheme}.png`)});
          await page.locator('#k1 .quiz-section').first().screenshot({path:join(screenshots, `quiz-${width}-${colorScheme}.png`)});
        }
        assert.deepEqual(errors, []);
        console.log(`${width}px ${colorScheme}: layout, navigation/focus, quiz, written labels, simulation keyboard and SVG names passed.`);
        await page.close();
      }
    }
    const fallback = await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:900}});
    await fallback.goto(fileUrl);
    assert.equal(await fallback.locator('.css-sim:visible').count(),7);
    await fallback.locator('#mat-mirror').focus();
    assert.equal(await fallback.locator('label[for="mat-mirror"]').evaluate(el=>getComputedStyle(el).outlineStyle), 'solid');
    await fallback.locator('label[for="mat-black"]').click();
    assert.ok(await fallback.locator('.scene.mat-black').isVisible());
    console.log('JavaScript disabled: native simulations and keyboard focus passed.');
    await fallback.close();
    const hosted = await browser.newPage();
    await hosted.route('https://optik.test/', route=>route.fulfill({contentType:'text/html',body:html}));
    await hosted.route('https://www.youtube.com/embed/**', route=>route.fulfill({contentType:'text/html',body:'<html lang="de"><title>Video fixture</title></html>'}));
    await hosted.goto('https://optik.test/');
    const video = hosted.locator('.video-modern').first();
    const button = video.locator('.video-embed');
    const artButton = video.locator('.video-art-cta');
    await artButton.click();
    assert.equal(await button.getAttribute('aria-expanded'),'true');
    assert.equal(await artButton.getAttribute('aria-expanded'),'true');
    assert.equal(await video.locator('iframe').count(),1);
    await button.click();
    assert.equal(await artButton.getAttribute('aria-expanded'),'false');
    assert.equal(await video.locator('iframe').count(),0);
    console.log('Hosted video: controls, expanded states and iframe cleanup passed.');
    await hosted.emulateMedia({reducedMotion:'reduce'});
    assert.equal(await hosted.locator('.live-beam').first().evaluate(el=>getComputedStyle(el).animationName), 'none');
    await hosted.emulateMedia({media:'print'});
    assert.equal(await hosted.locator('.live-grid').first().evaluate(el=>getComputedStyle(el).display), 'block');
    assert.equal(await hosted.locator('.live-controls:visible').count(),0);
    console.log('Reduced motion and print layout passed.');
    await hosted.close();
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
