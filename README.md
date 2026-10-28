# DevirtualizeAudible

A browser extension that removes AI-narrated titles (Virtual Voice, AI Voice, voice replica and similar) from Audible
result listings.

## Description

If you are as annoyed as I am that when you're looking for new audiobooks you see pages and pages of "Virtual Voice"
narrations, then this is the add-on for you. When you're browsing audible.com this add-on looks through the search
results and removes the ones which are "narrated" by a "Virtual Voice". This may result in a blank page of search
results if the entire page was "narrated" by "Virtual Voice" titles. Just go on to the next page and see one or two
actual audiobooks amongst the growing virtual horde.

## Features

* Removes titles narrated by "Virtual Voice", "AI Voice", "AI Narrator", "Synthesized Voice", "Digital Voice" or
  `<name>'s voice replica` from result listings on audible.com, audible.co.uk, audible.ca, audible.com.au and
  audible.in, also when such a narrator is listed next to a human one.
  See [docs/01-page-coverage.md](docs/01-page-coverage.md) for the pages.
* Shows a single "N AI-NARRATED TITLE(S) REMOVED BY DEVIRTUALIZER" line under the result count.
* Advanced search (`/advsr`): adds an "Exclude AI-narrated titles" checkbox (checked by default) under the Keyword
  field. When checked, `-virtual_voice` is added to the keywords on submit so Audible leaves most AI-narrated titles
  out and result pages stay fuller; the extension still filters whatever gets through. The checkbox state is
  remembered in that Audible site's localStorage.
* Add `devirtualize=no` to any Audible URL (for example `/search?keywords=litrpg&devirtualize=no`) to turn the
  extension off for that page.

## Install unpacked

Version 1.1.0 is not on the browser stores. Build it (see BUILD/TEST below), or download a zip from the GitHub
Releases page (or a pull request's build artifacts) and extract it into a folder that will stay in place, then:

* Chrome/Edge: open `chrome://extensions` (or `edge://extensions`), enable "Developer mode", click "Load unpacked"
  and select `dist/chrome` or the folder you extracted the Chrome zip into.
* Firefox: open `about:debugging`, click "This Firefox", click "Load Temporary Add-on" and select
  `dist/firefox/manifest.json` or the Firefox zip. Temporary add-ons are removed when Firefox restarts.

## Motivation

At the time of this writing (March 2024) here is the sad state of affairs when trying to actually find an audiobook narrated by a human:

* Of the latest 100 new titles in science fiction and fantasy, only 11 are narrated by actual human beings
* Of the latest 100 new titles in mystery and thrillers, only 17 are narrated by actual human beings
* Of the latest 100 new titles in romance, only 19 are narrated by actual human beings
* Of the latest 100 new titles in genre fiction, only 15 are narrated by actual human beings
* Of the latest **200** new titles in literature and fiction, only 27 (out of **200**) are narrated by actual human beings

Update October 2026: of the latest 100 new titles in mystery, thriller and suspense, 69 are narrated by humans and 31
by Virtual Voice.

I just got tired and tired of having to scroll through all of this garbage being shoveled onto us.

Cheers and happy listening.

## Screenshots

Before installing the add-on: a search listings page which has "Virtual Voice" "narrations" burying any actual
audiobooks:

![Before installing the add-on: a search listings page which has "Virtual Voice" "narrations" burying any actual audiobooks.](screenshots/Screenshot%202024-03-07%20at%2012-54-58%20Science%20Fiction%20&%20Fantasy%20Audiobooks%20in%20English%20Audible.com%201280x800.png)

After installing the add-on: a search listings page where you can see the (1) actual human-narrated title, and the
removal message to let you know the search results have been filtered:

![After installing the add-on: a search listings page where you can see the (1) actual human-narrated title.](screenshots/Screenshot%202024-03-08%20at%2008-49-04%20Science%20Fiction%20&%20Fantasy%20Audiobooks%20in%20English%20Audible.com%201280x800.png)

(Note that since version 1.0.2 the message includes the *number* of titles that have been filtered, too.)

## LINKS

The store listings are the upstream releases (1.0.4). Version 1.1.0 of this fork is only available unpacked.

FIREFOX: (1.0.4 published) https://addons.mozilla.org/en-US/firefox/addon/devirtualizeaudible/

CHROME/EDGE: (1.0.4 published) [https://chromewebstore.google.com/detail/fegkpndgbjchmippoedipimhnedijfla/](https://chromewebstore.google.com/detail/devirtualizeaudible/fegkpndgbjchmippoedipimhnedijfla)

## VERSION HISTORY

* 1.0 - Initial release which silently removed titles without a message
* 1.0.1 - Added a generic removal message without a count
* 1.0.2 -- Includes count of elements removed and some basic sanity checks before actions
* 1.0.3 -- Also filter out "voice replica" titles and allow quick "devirtualize=no" param
* 1.0.4 -- Also filter out "AI Voice" titles
* 1.1.0 -- Runs on all result-card pages (adds bestsellers), handles results loaded in place, more reliable card
  detection, single updating summary line, "Exclude AI-narrated titles" checkbox on advanced search

Later versions: see GitHub Releases.

## BUILD/TEST

```
./build.sh
```

This creates `dist/chrome/` and `dist/firefox/` (load unpacked, see above) and `dist/chrome.zip` and
`dist/firefox.zip`. The source manifests carry the placeholder version `0.0.0`; `VERSION=1.2.3 ./build.sh` injects a
real one.

End-to-end tests load both builds in Chromium and Firefox (Playwright) on small fixture pages served at audible.com
URLs, so no live Audible traffic is involved. They run in the Docker Hardened Images Playwright container
(`docker login dhi.io` once); use the tag that matches `@playwright/test` in `package.json`:

```
./build.sh
docker run --rm --init --ipc=host -v "$(pwd)":/work -w /work dhi.io/playwright:1.64.1-debian13-dev \
  bash -lc 'npm ci && npx playwright test'
```

`npm run lint` runs `web-ext lint` on the Firefox build.

The GitHub Actions workflow runs the same script on every pull request and push to `main`, lints the Firefox build,
uploads both builds as artifacts and runs the end-to-end tests.

Pull requests are squash-merged, so the PR title becomes the commit on `main` and must follow
[Conventional Commits](https://www.conventionalcommits.org/) (checked in CI). The PR title decides the next version:
a breaking change (`!` or `BREAKING CHANGE:`) bumps major, `feat` minor, `fix` or `perf` patch; other types do not
release. On each push to `main`, CI runs `./next-version.sh` (run it locally to preview), builds with that version,
tags `v<version>` and publishes a GitHub Release with both zips.
