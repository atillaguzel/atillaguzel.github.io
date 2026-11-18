/* Shared behaviour for every page: analytics and events that start only after the visitor
   accepts, and the share panel at the end of a post. See DESIGN.md. */

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
    if (isLocal) return;
    if (loaded) {
      window.gtag('consent', 'update', { analytics_storage: 'granted' });
      return;
    }
    loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // Say exactly what was agreed to: measurement, and nothing to do with advertising.
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // Add ?ga_debug to an address to watch events arrive in GA4's DebugView.
      debug_mode: /[?&]ga_debug\b/.test(location.search) || undefined
    });
    var script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
    document.head.appendChild(script);
  }

  function stopAnalytics() {
    document.documentElement.dataset.analytics = 'off';
    window['ga-disable-' + MEASUREMENT_ID] = true;
    if (loaded) window.gtag('consent', 'update', { analytics_storage: 'denied' });
    document.cookie.split(';').forEach(function (pair) {
      var name = pair.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0) return;
      document.cookie = name + '=; Max-Age=0; path=/';
      document.cookie = name + '=; Max-Age=0; path=/; domain=' + location.hostname;
    });
  }

  // Events. Nothing is sent unless the visitor has accepted. Markup declares what to send:
  //   data-track="share" data-track-method="x"                     on a button or link
  //   data-track="demo_interaction" data-track-demo="pipeline"     on a button, or on the
  //     data-track-action="example"                                box that holds several
  //   data-track-input="demo_interaction" data-track-demo="..."    on a text field
  // What a visitor types is never sent, only the fact that they used the field, once.
  function track(name, params) {
    if (document.documentElement.dataset.analytics !== 'on') return;
    if (isLocal) {
      (window.__tracked = window.__tracked || []).push([name, params]);
      return;
    }
    if (window.gtag) window.gtag('event', name, params);
  }

  function paramsFor(el, action) {
    var data = el.dataset;
    var params = {};
    if (data.trackMethod) {
      var post = location.pathname.match(/^\/blog\/([^/]+)\//);
      params.method = data.trackMethod;
      params.content_type = 'article';
      params.item_id = post ? post[1] : location.pathname;
    }
    if (data.trackDemo) {
      params.demo_name = data.trackDemo;
      params.demo_action = action || data.trackAction || 'use';
    }
    return params;
  }

  document.addEventListener('click', function (event) {
    var control = event.target.closest('a, button');
    var marked = control && control.closest('[data-track]');
    if (marked) track(marked.dataset.track, paramsFor(marked));
  });

  document.addEventListener('input', function (event) {
    var field = event.target.closest('[data-track-input]');
    if (!field || field.dataset.tracked) return;
    field.dataset.tracked = 'yes';
    track(field.dataset.trackInput, paramsFor(field, 'type'));
  });

  // The theme switch. The site follows the device's setting until the visitor presses the
  // switch. Their choice is kept in this browser, and a small script in each page's <head>
  // applies it before anything is painted. Choosing the theme the device already asks for
  // forgets the choice, so the site goes back to following the device.
  var prefersDark = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  var switches = [].slice.call(document.querySelectorAll('.theme'));

  function deviceTheme() {
    return prefersDark && prefersDark.matches ? 'dark' : 'light';
  }

  function currentTheme() {
    return document.documentElement.dataset.theme || deviceTheme();
  }

  function showTheme() {
    var dark = currentTheme() === 'dark';
    switches.forEach(function (button) {
      button.setAttribute('aria-pressed', String(dark));
      button.setAttribute('aria-label', 'Switch to the ' + (dark ? 'light' : 'dark') + ' theme');
    });
  }

  switches.forEach(function (button) {
    button.hidden = false;
    button.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      var root = document.documentElement;
      root.classList.add('theme-fading');
      setTimeout(function () { root.classList.remove('theme-fading'); }, 360);
      try {
        if (next === deviceTheme()) {
          delete root.dataset.theme;
          localStorage.removeItem('theme');
        } else {
          root.dataset.theme = next;
          localStorage.setItem('theme', next);
        }
      } catch (e) {
        root.dataset.theme = next;
      }
      showTheme();
      track('theme_change', { theme: next });
    });
  });

  if (prefersDark && prefersDark.addEventListener) prefersDark.addEventListener('change', showTheme);
  showTheme();

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

  // Tables in a post. On a phone each row stacks into a small block with its column names
  // beside the values, so nothing scrolls sideways. The stylesheet does the stacking; this
  // copies the column names onto the cells and keeps the table's meaning for screen readers,
  // which is lost when table elements are laid out as blocks.
  [].forEach.call(document.querySelectorAll('.post .scroll > table'), function (table) {
    var heads = [].map.call(table.querySelectorAll('thead th'), function (th) { return th.textContent.trim(); });
    if (!heads.length) return;
    table.setAttribute('role', 'table');
    [].forEach.call(table.querySelectorAll('thead, tbody'), function (group) { group.setAttribute('role', 'rowgroup'); });
    [].forEach.call(table.querySelectorAll('thead th'), function (th) { th.setAttribute('role', 'columnheader'); });
    [].forEach.call(table.querySelectorAll('tr'), function (row) { row.setAttribute('role', 'row'); });
    [].forEach.call(table.querySelectorAll('tbody tr'), function (row) {
      [].forEach.call(row.children, function (cell, i) {
        cell.setAttribute('role', 'cell');
        if (heads[i]) cell.dataset.label = heads[i];
      });
    });
    table.classList.add('stacks');
  });

  // Offer a break after punctuation, so a long name breaks at a dot or a bracket before it
  // is cut mid-word. A <wbr> is an element, not text, so copying ignores it.
  function addPieces(parent, text) {
    (text.match(/[^.,(\[=:\/]*[.,(\[=:\/]?/g) || []).forEach(function (piece, k) {
      if (!piece) return;
      if (k) parent.appendChild(document.createElement('wbr'));
      parent.appendChild(document.createTextNode(piece));
    });
  }

  // Code blocks. Each line becomes its own box so the stylesheet can wrap a long line under
  // itself with a hanging indent. The text is unchanged, so copying a block gives the code
  // exactly as written. Without script a block scrolls sideways as before.
  [].forEach.call(document.querySelectorAll('.post pre > code'), function (code) {
    var lines = code.textContent.replace(/\n$/, '').split('\n');
    code.textContent = '';
    lines.forEach(function (text, n) {
      var line = document.createElement('span');
      line.className = 'line';
      var indent = text.match(/^ */)[0].length;
      var rest = text + (n < lines.length - 1 ? '\n' : '');
      line.style.setProperty('--i', indent);
      if (indent && text.length > indent) {
        // Keep the indentation and the first character together, or a long first word
        // would drop to the next row and leave the indentation alone on a blank one.
        var lead = document.createElement('span');
        lead.className = 'ind';
        lead.textContent = text.slice(0, indent + 1);
        line.appendChild(lead);
        rest = rest.slice(indent + 1);
      }
      // A trailing comment stays with its marker: the row breaks before the "#", never
      // between it and the first word of the comment.
      var comment = rest.match(/(^|\s)((?:#|\/\/) +\S+)/);
      if (comment) {
        var at = comment.index + comment[1].length;
        addPieces(line, rest.slice(0, at));
        var kept = document.createElement('span');
        kept.className = 'nb';
        kept.textContent = comment[2];
        line.appendChild(kept);
        addPieces(line, rest.slice(at + comment[2].length));
      } else {
        addPieces(line, rest);
      }
      code.appendChild(line);
    });
    code.parentNode.classList.add('wraps');
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
