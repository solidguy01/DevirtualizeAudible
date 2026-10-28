const { test, expect } = require('./fixtures');

const SEARCH = 'https://www.audible.com/search?keywords=werewolf';
const ADVSR = 'https://www.audible.com/advsr';
// Hidden AI cards stay in the DOM, so count only visible ones
const CARDS = 'li.productListItem:visible';
const AI_CARDS = 'li.productListItem[data-devirtualizer="ai"]';
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
  test('hides AI-narrated cards and shows one summary line', async ({ page }) => {
    await page.goto(SEARCH);
    await expect(page.locator(SUMMARY)).toContainText('7 AI-NARRATED TITLE(S) FILTERED BY DEVIRTUALIZER');
    await expect(page.locator(CARDS)).toHaveCount(2);
    await expect(page.locator(`${CARDS} h3`)).toHaveText(['Human', 'Pre-order']);
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

  for (const host of ['www.audible.co.uk', 'www.audible.ca', 'www.audible.com.au', 'www.audible.in']) {
    test(`filters on ${host}`, async ({ page }) => {
      await page.goto(`https://${host}/search?keywords=werewolf`);
      await expect(page.locator(SUMMARY)).toHaveText(/^7 /);
      await expect(page.locator(CARDS)).toHaveCount(2);
    });
  }

  test('does nothing on Audible stores it does not support', async ({ page }) => {
    await page.goto('https://www.audible.de/search?keywords=werewolf');
    await settle(page);
    await expect(page.locator(CARDS)).toHaveCount(9);
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

test.describe('show/hide toggle', () => {
  const toggle = (page) => page.locator(`${SUMMARY} button`);

  test('hides by default, shows dimmed on click and remembers it', async ({ page }) => {
    await page.goto(SEARCH);
    await expect(toggle(page)).toHaveText('Show');
    await expect(page.locator(CARDS)).toHaveCount(2);
    await toggle(page).click();
    await expect(toggle(page)).toHaveText('Hide');
    await expect(page.locator(CARDS)).toHaveCount(9);
    await expect(page.locator(AI_CARDS).first()).toHaveCSS('opacity', '0.4');
    await expect(page.locator(SUMMARY)).toContainText('7 AI-NARRATED');

    await page.goto(SEARCH);
    await expect(toggle(page)).toHaveText('Hide');
    await expect(page.locator(CARDS)).toHaveCount(9);
    await toggle(page).click();
    await expect(toggle(page)).toHaveText('Show');
    await expect(page.locator(CARDS)).toHaveCount(2);
  });

  test('applies the current choice to cards added later', async ({ page }) => {
    await page.goto(SEARCH);
    await toggle(page).click();
    await expect(page.locator(CARDS)).toHaveCount(9);
    await addCard(page, 'Narrated by: Virtual Voice');
    await expect(page.locator(SUMMARY)).toContainText('8 AI-NARRATED');
    await expect(page.locator(AI_CARDS).last()).toHaveCSS('opacity', '0.4');
    await expect(page.locator(CARDS)).toHaveCount(10);
  });

  test('shows a hidden card again when it is reused for a human narrator', async ({ page }) => {
    await page.goto(SEARCH);
    await expect(page.locator(CARDS)).toHaveCount(2);
    await page.locator(`${AI_CARDS} .narratorLabel`).first().evaluate((label) => {
      label.textContent = 'Narrated by: John Roe';
    });
    await expect(page.locator(CARDS)).toHaveCount(3);
    await expect(page.locator(SUMMARY)).toContainText('6 AI-NARRATED');
  });
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
