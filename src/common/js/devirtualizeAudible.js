'use strict';

(() => {
  // ?devirtualize=no disables the extension for that page load
  if (new URL(document.URL).searchParams.get('devirtualize') === 'no') {
    return;
  }

  // Matched against the narrator text after the "Narrated by:" prefix
  const AI_NARRATOR_PATTERNS = [
    /^Virtual Voice/i,
    /^AI Voice/i,
    /^AI Narrator/i,
    /^Synthesized Voice/i,
    /voice replica/i,
  ];

  // Search term that makes Audible exclude synthetic narrations server-side
  const EXCLUDE_TERM = '-virtual_voice';
  const PREF_KEY = 'devirtualizer.excludeAiNarrated';
  const MARK = 'devirtualizer';
  const SUMMARY_ID = 'devirtualizer-summary';
  const CHECKBOX_ID = 'devirtualizer-exclude';
  // Fallback depth from .narratorLabel to its result card (Audible DOM, Oct 2026)
  const CARD_DEPTH = 9;

  let titlesRemoved = 0;

  function isAiNarrated(label) {
    const text = label.textContent.replace(/\s+/g, ' ').trim();
    const match = text.match(/^Narrated by:\s*(.*)$/i);
    return Boolean(match) && AI_NARRATOR_PATTERNS.some((re) => re.test(match[1]));
  }

  function findCard(label) {
    let card = label.closest('li.productListItem');
    if (!card) {
      card = label;
      for (let i = 0; i < CARD_DEPTH && card; i++) {
        card = card.parentElement;
      }
    }
    return card && card.parentElement && card.parentElement.nodeName === 'UL' ? card : null;
  }

  function updateSummary() {
    if (!titlesRemoved) {
      return;
    }
    const target = document.querySelector('.resultsSummarySubheading');
    if (!target) {
      return;
    }
    let summary = document.getElementById(SUMMARY_ID);
    if (!summary) {
      summary = document.createElement('p');
      summary.id = SUMMARY_ID;
      summary.appendChild(document.createElement('strike'));
    }
    if (summary.parentElement !== target) {
      target.appendChild(summary);
    }
    const text = `${titlesRemoved} VIRTUAL VOICE TITLE(S) REMOVED BY DEVIRTUALIZER`;
    // Only write on change, otherwise the observer would retrigger forever
    if (summary.firstChild.textContent !== text) {
      summary.firstChild.textContent = text;
    }
  }

  function filterResults() {
    for (const label of document.querySelectorAll('.narratorLabel')) {
      const card = findCard(label);
      if (!card || card.dataset[MARK]) {
        continue;
      }
      if (isAiNarrated(label)) {
        card.remove();
        titlesRemoved++;
      } else {
        card.dataset[MARK] = 'kept';
      }
    }
    updateSummary();
  }

  function readPref() {
    try {
      return localStorage.getItem(PREF_KEY) !== 'false';
    } catch (e) {
      return true;
    }
  }

  function writePref(value) {
    try {
      localStorage.setItem(PREF_KEY, String(value));
    } catch (e) {
      // Storage blocked; the checkbox still works for this page load
    }
  }

  function setupAdvancedSearch() {
    const keywords = document.getElementById('ad-search-key');
    const form = keywords && keywords.form;
    if (!form || document.getElementById(CHECKBOX_ID)) {
      return;
    }

    // No name attribute, so the checkbox itself is never submitted
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = CHECKBOX_ID;
    checkbox.checked = readPref();
    checkbox.addEventListener('change', () => writePref(checkbox.checked));

    const label = document.createElement('label');
    label.htmlFor = CHECKBOX_ID;
    label.style.marginLeft = '0.4em';
    label.textContent = 'Exclude AI-narrated titles';

    const wrapper = document.createElement('div');
    wrapper.style.marginTop = '0.4em';
    wrapper.append(checkbox, label);
    keywords.parentElement.after(wrapper);

    form.addEventListener('submit', () => {
      if (!checkbox.checked) {
        return;
      }
      const words = keywords.value.trim().split(/\s+/).filter(Boolean);
      if (!words.some((w) => w.toLowerCase() === EXCLUDE_TERM)) {
        words.push(EXCLUDE_TERM);
        keywords.value = words.join(' ');
      }
    });
  }

  function run() {
    filterResults();
    setupAdvancedSearch();
  }

  run();

  // Re-run when Audible swaps content in place; debounced, and run() is idempotent
  let timer = null;
  new MutationObserver(() => {
    clearTimeout(timer);
    timer = setTimeout(run, 200);
  }).observe(document.body, { childList: true, subtree: true });
})();
