// Shared navigation only; called by the isolated, synthetic home fixture.
const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async function verifyDashboardNavigation({ page, directory }) {
  // The dialog correctly hides the page trigger from the accessibility tree
  // while open; keep a handle to inspect its expanded state without exposing it.
  const menu = page.getByRole('button', { name: 'Abrir menú', exact: true, includeHidden: true });
  const drawer = page.getByRole('dialog', { name: 'Menú principal', exact: true });
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Header fits ${width}px`);
    const quick = page.getByRole('group', { name: 'Accesos rápidos', exact: true });
    const boxes = await quick.locator('a:visible, button:visible, input:visible').evaluateAll(elements => elements.map(el => {
      const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }));
    assert.equal(boxes.length, 3);
    assert(boxes.every(r => r.width >= 44 && r.height >= 44 && r.right <= width), `44px actions fit ${width}px`);
    if (width < 1024) {
      const m = await menu.boundingBox();
      assert(m && boxes.every(r => r.y - (m.y + m.height) >= 12 || r.x - (m.x + m.width) >= 12), 'Menu does not crowd quick actions');
      await menu.click();
      await drawer.waitFor();
      assert.equal(await menu.getAttribute('aria-expanded'), 'true');
      const current = drawer.locator('a[aria-current="page"]');
      assert.equal(await current.count(), 1);
      assert.equal(await current.textContent(), 'Inicio');
      for (let i = 0; i < 18; i++) {
        await page.keyboard.press('Tab');
        assert(await drawer.evaluate(node => node.contains(document.activeElement)), 'Keyboard focus stays inside menu');
      }
      const close = drawer.getByRole('button', { name: 'Cerrar menú', exact: true });
      const closeBox = await close.boundingBox();
      assert(closeBox && closeBox.width >= 44 && closeBox.height >= 44);
      const signout = await drawer.getByRole('button', { name: 'Cerrar sesión', exact: true }).boundingBox();
      assert(signout && signout.width >= 44 && signout.height >= 44);
      assert(await drawer.locator('nav a').evaluateAll(links => links.every(a => new URL(a.href).searchParams.get('tenant') === 'fixture-selected')));
      if (width === 390) await page.screenshot({ path: path.join(directory, 'navigation-mobile-open.png'), fullPage: false });
      await page.keyboard.press('Escape');
      await drawer.waitFor({ state: 'hidden' });
      assert.equal(await menu.getAttribute('aria-expanded'), 'false');
      await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Abrir menú');
      assert(await menu.evaluate(node => node === document.activeElement), 'Closing restores focus to the menu trigger');
    } else {
      assert.equal(await menu.isVisible(), false);
      assert.equal(await page.locator('aside a[aria-current="page"]:visible').count(), 1);
    }
  }
  await page.screenshot({ path: path.join(directory, 'navigation-desktop.png'), fullPage: false });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(directory, 'navigation-mobile.png'), fullPage: false });
  await menu.click();
  await drawer.waitFor();
  await page.setViewportSize({ width: 1440, height: 900 });
  await drawer.waitFor({ state: 'hidden' });
  assert.notEqual(await page.locator('body').getAttribute('data-scroll-locked'), '1', 'Desktop resize releases the modal scroll lock');
  await page.setViewportSize({ width: 390, height: 844 });
  await menu.click();
  await drawer.getByRole('link', { name: 'Inicio', exact: true }).click();
  await drawer.waitFor({ state: 'hidden' });
  console.log('PASS shared navigation: five widths, 44px targets, current page, tenant links, focus trap, Escape, focus restoration, desktop resize and selection close');
};
