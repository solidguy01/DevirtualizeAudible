const { test, expect } = require('./fixtures');

const SEARCH = 'https://www.audible.com/search?keywords=werewolf';
const ADVSR = 'https://www.audible.com/advsr';
const CARDS = 'li.productListItem';
const SUMMARY = '#devirtualizer-summary';

// Runs in the page's main world; the DOM is shared with the content script
function addCard(page, narratorLabel) {
  return page.evaluate((text) => {
    const card = document.createElement('li');
    card.className = 'productListItem';
    card.innerHTML = '<h3>Added</h3><ul><li class="narratorLabel"></li></ul>';
    card.querySelector('.narratorLabel').textContent = text;
    document.getElementById('results').append(card);
  }, narratorLabel);
}

// The content script has no signal for "done"; give it time before asserting that nothing happened
const settle = (page) => page.waitForTimeout(500);

test.describe('result filtering', () => {
  test('removes AI-narrated cards and shows one summary line', async ({ page }) => {
    await page.goto(SEARCH);
    await expect(page.locator(SUMMARY)).toHaveText('7 AI-NARRATED TITLE(S) REMOVED BY DEVIRTUALIZER');
    await expect(page.locator(CARDS)).toHaveCount(2);
    await expect(page.locator('#results h3')).toHaveText(['Human', 'Pre-order']);
    await expect(page.locator(SUMMARY)).toHaveCount(1);
  });

  test('filters cards added after load', async ({ page }) => {
    await page.goto(SEARCH);
    await expect(page.locator(CARDS)).toHaveCount(2);
    await addCard(page, 'Narrated by: Virtual Voice');
    await addCard(page, 'Narrated by: John Roe');
    await expect(page.locator(SUMMARY)).toHaveText(/^8 /);
    await expect(page.locator(CARDS)).toHaveCount(3);
  });

  test('filters a card once its narrator name appears', async ({ page }) => {
    await page.goto(SEARCH);
    await expect(page.locator(CARDS)).toHaveCount(2);
    await addCard(page, 'Narrated by: ');
    await settle(page);
    await expect(page.locator(CARDS)).toHaveCount(3);
    await page.locator('.narratorLabel').last().evaluate((label) => {
      label.textContent = 'Narrated by: AI Voice Ed';
    });
    await expect(page.locator(CARDS)).toHaveCount(2);
    await expect(page.locator(SUMMARY)).toHaveText(/^8 /);
  });

  test('stops mutating the page once filtered', async ({ page }) => {
    await page.goto(SEARCH);
    await expect(page.locator(SUMMARY)).toBeVisible();
    const mutations = await page.evaluate(
      () =>
        new Promise((resolve) => {
          let count = 0;
          new MutationObserver((records) => (count += records.length)).observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
          });
          setTimeout(() => resolve(count), 1000);
        }),
    );
    expect(mutations).toBe(0);
  });

  for (const url of ['https://www.audible.com/search?devirtualize=no', `${SEARCH}&devirtualize=no`]) {
    test(`does nothing with ${url.slice(url.indexOf('?'))}`, async ({ page }) => {
      await page.goto(url);
      await settle(page);
      await expect(page.locator(CARDS)).toHaveCount(9);
      await expect(page.locator(SUMMARY)).toHaveCount(0);
    });
  }
});

test.describe('advanced search', () => {
  const keywords = (request) => new URL(request.url()).searchParams.get('keywords');

  async function submit(page, value) {
    await page.fill('#ad-search-key', value);
    const [request] = await Promise.all([
      page.waitForRequest((r) => new URL(r.url()).pathname === '/search'),
      page.click('button[type=submit]'),
    ]);
    return keywords(request);
  }

  test('adds -virtual_voice once when checked', async ({ page }) => {
    await page.goto(ADVSR);
    await expect(page.locator('#devirtualizer-exclude')).toBeChecked();
    await expect(page.locator('#devirtualizer-exclude')).toHaveCount(1);
    expect(await submit(page, 'werewolf')).toBe('werewolf -virtual_voice');
    await page.goto(ADVSR);
    expect(await submit(page, 'werewolf -virtual_voice')).toBe('werewolf -virtual_voice');
  });

  test('leaves keywords alone when unchecked and remembers the choice', async ({ page }) => {
    await page.goto(ADVSR);
    await page.uncheck('#devirtualizer-exclude');
    expect(await submit(page, 'werewolf')).toBe('werewolf');
    await page.goto(ADVSR);
    await expect(page.locator('#devirtualizer-exclude')).not.toBeChecked();
  });
});
