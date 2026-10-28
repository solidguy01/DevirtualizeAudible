'use strict';

(() => {
  // ?devirtualize=no disables the extension for that page load
  if (new URLSearchParams(location.search).get('devirtualize') === 'no') {
    return;
  }

  // Matched against each comma-separated name after the "Narrated by:" prefix
  const AI_NARRATOR_PATTERNS = [
    /^Virtual Voice/i,
    /^AI Voice/i,
    /^AI Narrator/i,
    /^Synthesized Voice/i,
    /voice replica/i,
    /digital(ized)? voice/i,
  ];

  // Search term that makes Audible exclude synthetic narrations server-side
  const EXCLUDE_TERM = '-virtual_voice';
  const EXCLUDE_PREF = 'devirtualizer.excludeAiNarrated';
  const SHOW_PREF = 'devirtualizer.showHidden';
  const SUMMARY_ID = 'devirtualizer-summary';
  const CHECKBOX_ID = 'devirtualizer-exclude';
  // Marks AI cards; they are hidden or dimmed, not removed, so "Show" can bring them back
  const MARK = 'data-devirtualizer';
  const AI_CARDS = `li.productListItem[${MARK}="ai"]`;

  function readPref(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : value === 'true';
    } catch {
      return fallback;
    }
  }

  function writePref(key, value) {
    try {
      localStorage.setItem(key, String(value));
    } catch {
      // Storage blocked; the setting still works for this page load
    }
  }

  // Only write on change, otherwise the observer would retrigger forever
  function setText(node, text) {
    if (node.textContent !== text) {
      node.textContent = text;
    }
  }

  function applyVisibility() {
    const show = readPref(SHOW_PREF, false);
    for (const card of document.querySelectorAll(AI_CARDS)) {
      card.style.display = show ? '' : 'none';
      card.style.opacity = show ? '0.4' : '';
    }
  }

  function updateSummary() {
    const count = document.querySelectorAll(AI_CARDS).length;
    const target = document.querySelector('.resultsSummarySubheading');
    if (!count || !target) {
      document.getElementById(SUMMARY_ID)?.remove();
      return;
    }
    let summary = document.getElementById(SUMMARY_ID);
    if (!summary) {
      summary = document.createElement('p');
      summary.id = SUMMARY_ID;
      const toggle = document.createElement('button');
      toggle.type = 'button';
      toggle.style.marginLeft = '0.5em';
      toggle.addEventListener('click', () => {
        writePref(SHOW_PREF, !readPref(SHOW_PREF, false));
        applyVisibility();
        updateSummary();
      });
      summary.append(document.createElement('strike'), toggle);
    }
    if (summary.parentElement !== target) {
      target.appendChild(summary);
    }
    setText(summary.firstChild, `${count} AI-NARRATED TITLE(S) FILTERED BY DEVIRTUALIZER`);
    setText(summary.lastChild, readPref(SHOW_PREF, false) ? 'Hide' : 'Show');
  }

  function filterResults() {
    for (const label of document.querySelectorAll('.narratorLabel')) {
      // .narratorLabel is itself an li, so select the result card by class
      const card = label.closest('li.productListItem');
      const match = label.textContent.replace(/\s+/g, ' ').trim().match(/^Narrated by:\s*(\S.*)/i);
      const names = match ? match[1].split(',').map((name) => name.trim()) : [];
      if (!card) {
        continue;
      }
      if (names.some((name) => AI_NARRATOR_PATTERNS.some((re) => re.test(name)))) {
        card.setAttribute(MARK, 'ai');
      } else if (card.hasAttribute(MARK)) {
        // Card node reused for a human-narrated title
        card.removeAttribute(MARK);
        card.style.display = card.style.opacity = '';
      }
    }
    applyVisibility();
    updateSummary();
  }

  function setupAdvancedSearch() {
    const keywords = document.getElementById('ad-search-key');
    const form = keywords?.form;
    if (!form || document.getElementById(CHECKBOX_ID)) {
      return;
    }

    // No name attribute, so the checkbox itself is never submitted
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = CHECKBOX_ID;
    checkbox.checked = readPref(EXCLUDE_PREF, true);
    checkbox.addEventListener('change', () => writePref(EXCLUDE_PREF, checkbox.checked));

    const label = document.createElement('label');
    label.style.display = 'block';
    label.append(checkbox, ' Exclude AI-narrated titles');
    keywords.parentElement.after(label);

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

  // Re-run at most every 200 ms while Audible changes the page; run() is idempotent.
  // A throttle, not a debounce, so pages that never stop mutating still get filtered.
  let pending = false;
  new MutationObserver(() => {
    if (!pending) {
      pending = true;
      setTimeout(() => {
        pending = false;
        run();
      }, 200);
    }
  }).observe(document.body, { childList: true, subtree: true });
})();
