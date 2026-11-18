/* Shared behaviour for every page: analytics that load only after the visitor accepts,
   and the share panel at the end of a post. See DESIGN.md. */

(function () {
  'use strict';

  var MEASUREMENT_ID = 'G-SNJ8BBR11L';
  var KEY = 'analytics-consent';   // 'granted' or 'denied', kept in this browser only
  var ASK_AFTER_MS = 10000;

  // Local previews never send visits to Google.
  var isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);

  function readChoice() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }

  function saveChoice(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  var loaded = false;

  function startAnalytics() {
    document.documentElement.dataset.analytics = 'on';
    window['ga-disable-' + MEASUREMENT_ID] = false;
    if (loaded || isLocal) return;
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(script);
  }

  function stopAnalytics() {
    document.documentElement.dataset.analytics = 'off';
    window['ga-disable-' + MEASUREMENT_ID] = true;
    document.cookie.split(';').forEach(function (pair) {
      var name = pair.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0) return;
      document.cookie = name + '=; Max-Age=0; path=/';
      document.cookie = name + '=; Max-Age=0; path=/; domain=' + location.hostname;
    });
  }

  var box = null;

  function closeBox() {
    if (!box) return;
    var el = box;
    box = null;
    el.classList.add('is-leaving');
    el.classList.remove('is-in');
    setTimeout(function () { el.remove(); }, 450);
  }

  function choose(value) {
    saveChoice(value);
    if (value === 'granted') startAnalytics(); else stopAnalytics();
    closeBox();
  }

  // slow: the unasked first appearance drifts in; a box the visitor asked for appears at once.
  function openBox(slow) {
    if (box) return;
    box = document.createElement('aside');
    box.className = 'consent stip' + (slow ? ' is-slow' : '');
    box.setAttribute('aria-label', 'Analytics');
    box.innerHTML =
      '<div class="face panel">' +
        '<p class="consent-h">analytics</p>' +
        '<p>Mind if I count your visit? I use Google Analytics to see which pages get read. Nothing loads unless you say yes.</p>' +
        '<p class="actions">' +
          '<button type="button" class="btn btn--sm" data-consent="granted">Yes, that’s fine</button>' +
          '<button type="button" class="btn btn--alt btn--sm" data-consent="denied">No thanks</button>' +
        '</p>' +
      '</div>';
    box.addEventListener('click', function (event) {
      var button = event.target.closest('[data-consent]');
      if (button) choose(button.dataset.consent);
    });
    document.body.appendChild(box);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { if (box) box.classList.add('is-in'); });
    });
  }

  // The footer control lets a visitor change their mind at any time.
  [].forEach.call(document.querySelectorAll('[data-consent-open]'), function (button) {
    button.hidden = false;
    button.addEventListener('click', function () { openBox(false); });
  });

  // The share panel at the end of a post. The X and Bluesky buttons are plain links and
  // need no script; copying the link and the device's own share sheet do.
  var pageUrl = (document.querySelector('link[rel="canonical"]') || {}).href || location.href;

  [].forEach.call(document.querySelectorAll('[data-copy-link]'), function (button) {
    var idle = button.textContent;
    button.hidden = false;
    button.addEventListener('click', function () {
      function flash(label) {
        button.textContent = label;
        button.classList.remove('is-done');
        void button.offsetWidth;
        button.classList.add('is-done');
        clearTimeout(button._timer);
        button._timer = setTimeout(function () {
          button.textContent = idle;
          button.classList.remove('is-done');
        }, 1600);
      }
      function selectAddress() {
        var address = document.querySelector('.share .addr');
        if (!address) return;
        var range = document.createRange();
        range.selectNodeContents(address);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        flash('Select the address');
      }
      try {
        navigator.clipboard.writeText(pageUrl).then(function () { flash('Copied'); }, selectAddress);
      } catch (e) {
        selectAddress();
      }
    });
  });

  if (navigator.share) {
    [].forEach.call(document.querySelectorAll('[data-native-share]'), function (button) {
      button.hidden = false;
      button.addEventListener('click', function () {
        var title = document.title.replace(/ \u00b7 Atilla Guzel$/, '');
        navigator.share({ title: title, url: pageUrl }).catch(function () {});
      });
    });
  }

  var choice = readChoice();
  if (choice === 'granted') {
    startAnalytics();
  } else if (choice !== 'denied' && !navigator.globalPrivacyControl) {
    // A browser that sends the Global Privacy Control signal has already answered no.
    setTimeout(function () { openBox(true); }, ASK_AFTER_MS);
  }
})();
