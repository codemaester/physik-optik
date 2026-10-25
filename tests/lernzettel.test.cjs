const assert = require('node:assert/strict');
const fs = require('node:fs');
const {join} = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const root = join(__dirname, '..');
const fileUrl = pathToFileURL(join(root, 'index.html')).href;
const screenshots = process.env.OPTIK_SCREENSHOTS;
if (screenshots) fs.mkdirSync(screenshots, {recursive:true});

(async () => {
  const browser = await chromium.launch();
  try {
    for (const width of [1440, 768, 390, 320]) {
      const page = await browser.newPage({viewport:{width, height:1000}, colorScheme:'dark'});
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(fileUrl);
      const link = page.getByRole('link', {name:'Lernzettel', exact:true});
      assert.ok(await link.isVisible(), `${width}px: Lernzettel shortcut visible`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      if (screenshots && width !== 320) {
        await page.screenshot({path:join(screenshots, `entry-${width}.png`)});
      }
      await link.click();
      assert.match(page.url(), /\/lernzettel\.html$/);
      assert.equal(await page.locator('.topic h2').count(), 8);
      assert.equal(await page.locator('.sheet').count(), 2);
      assert.equal(await page.locator('.sheet').first().locator('.topic').count(), 4);
      assert.equal(await page.locator('.sheet').last().locator('.topic').count(), 4);
      assert.equal(await page.locator('.sketch').count(), 6);
      for (const sketch of await page.locator('.sketch').all()) {
        assert.ok(await sketch.getAttribute('aria-label'));
      }
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      for (const sheet of await page.locator('.sheet').all()) {
        assert.equal(await sheet.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(255, 255, 255)');
      }
      await page.evaluate(() => { window.print = () => { window.printCalls = (window.printCalls || 0) + 1; }; });
      await page.getByRole('button', {name:'Drucken / als PDF speichern'}).click();
      assert.equal(await page.evaluate(() => window.printCalls), 1);
      if (screenshots && [1440, 390].includes(width)) {
        await page.screenshot({path:join(screenshots, `lernzettel-${width}.png`), fullPage:true});
      }
      await page.emulateMedia({media:'print'});
      assert.equal(await page.locator('.print-tools').isVisible(), false);
      const pdf = await page.pdf({preferCSSPageSize:true, printBackground:false, displayHeaderFooter:false});
      const pageCount = [...pdf.toString('latin1').matchAll(/\/Type\s*\/Page\b/g)].length;
      if (screenshots && width === 1440) {
        fs.writeFileSync(join(screenshots, 'lernzettel.pdf'), pdf);
        // Match the printable area of A4 with the stylesheet's 10 mm margins.
        await page.setViewportSize({width:718, height:1047});
        for (let index = 0; index < 2; index++) {
          await page.locator('.sheet').nth(index).screenshot({path:join(screenshots, `lernzettel-print-${index + 1}.png`)});
        }
      }
      assert.equal(pageCount, 2, `${width}px: A4 PDF must contain exactly two pages`);
      await page.setViewportSize({width:718, height:1047});
      for (const sheet of await page.locator('.sheet').all()) {
        assert.ok(await sheet.evaluate(el => el.getBoundingClientRect().height <= 1047), 'Each sheet must fit inside the A4 print area without clipping');
      }
      await page.emulateMedia({media:'screen'});
      await page.getByRole('link', {name:'Zurück zur Lernseite'}).click();
      assert.equal(page.url(), fileUrl);
      assert.deepEqual(errors, []);
      await page.close();
      console.log(`${width}px: offline navigation, diagrams, print action, two-page A4 PDF and return passed.`);
    }
    const page = await browser.newPage({javaScriptEnabled:false, viewport:{width:390, height:900}});
    await page.goto(fileUrl);
    await page.getByRole('link', {name:'Lernzettel', exact:true}).click();
    assert.ok(await page.getByRole('heading', {name:'Optik · Lernzettel', exact:true}).isVisible());
    assert.equal(await page.getByRole('button').count(), 0);
    assert.ok(await page.getByText('Alternativ kannst du die Druckfunktion deines Browsers nutzen.').isVisible());
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('.sketch:visible').count(), 6);
    await page.close();
    console.log('JavaScript disabled: learning sheet, print fallback and diagrams passed.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exit(1);});
