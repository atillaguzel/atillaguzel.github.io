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

  // Code blocks. A plain <pre><code> in a post becomes a labelled panel with a Copy button.
  // Each line becomes its own box so the stylesheet can wrap a long line under itself with
  // a hanging indent. The text is never changed, so copying a block, by the button or by
  // hand, gives the code exactly as written. Without script a block is a plain bordered box.
  //
  //   <pre data-lang="python">        names the language in the label
  //   <pre data-lang="python" data-results>
  //       a trailing "# value" comment is treated as that line's result: it starts covered,
  //       and a Show results button uncovers each one in turn
  [].forEach.call(document.querySelectorAll('.post > pre'), function (pre) {
    var code = pre.querySelector('code');
    if (!code) return;
    var source = code.textContent.replace(/\n$/, '');
    var lines = source.split('\n');
    var wantsResults = pre.hasAttribute('data-results');
    var results = [];

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
      // A comment is quieter than code and stays with its marker: the row breaks before
      // the "#", never between it and the first word of the comment.
      var comment = rest.match(/(^|\s)((?:#|\/\/) +)(\S+)([^\n]*)/);
      if (comment) {
        var at = comment.index + comment[1].length;
        addPieces(line, rest.slice(0, at));
        var quiet = document.createElement('span');
        quiet.className = 'c-com';
        var kept = document.createElement('span');
        kept.className = 'nb';
        if (wantsResults && comment[1]) {
          kept.appendChild(document.createTextNode(comment[2]));
          var result = document.createElement('span');
          result.className = 'res';
          result.textContent = comment[3] + comment[4];
          result.style.setProperty('--n', (comment[3] + comment[4]).length);
          kept.appendChild(result);
          results.push(result);
          quiet.appendChild(kept);
        } else {
          kept.textContent = comment[2] + comment[3];
          quiet.appendChild(kept);
          addPieces(quiet, comment[4]);
        }
        line.appendChild(quiet);
        line.appendChild(document.createTextNode(rest.slice(at + comment[0].length - comment[1].length)));
      } else {
        addPieces(line, rest);
      }
      code.appendChild(line);
    });
    pre.classList.add('wraps');

    var block = document.createElement('div');
    block.className = 'stip codeblock';
    var face = document.createElement('div');
    face.className = 'face code-face';
    var label = document.createElement('span');
    label.className = 'label';
    label.textContent = pre.dataset.lang || 'code';
    var tools = document.createElement('span');
    tools.className = 'code-tools';

    if (results.length) {
      block.classList.add('is-covered');
      var reveal = document.createElement('button');
      reveal.type = 'button';
      reveal.className = 'btn btn--alt btn--sm';
      reveal.textContent = 'Show results';
      reveal.setAttribute('aria-pressed', 'false');
      reveal.dataset.track = 'demo_interaction';
      reveal.dataset.trackDemo = 'code_block';
      reveal.dataset.trackAction = 'toggle';
      reveal.addEventListener('click', function () {
        var on = reveal.getAttribute('aria-pressed') !== 'true';
        reveal.setAttribute('aria-pressed', String(on));
        reveal.textContent = on ? 'Hide results' : 'Show results';
        block.classList.toggle('is-covered', !on);
        results.forEach(function (result, n) {
          result.style.animationDelay = (n * 380) + 'ms';
          result.classList.toggle('is-in', on);
        });
      });
      tools.appendChild(reveal);
    }

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.className = 'btn btn--alt btn--sm';
    copy.textContent = 'Copy';
    copy.dataset.track = 'demo_interaction';
    copy.dataset.trackDemo = 'code_block';
    copy.dataset.trackAction = 'copy';
    copy.addEventListener('click', function () {
      function flash(text) {
        copy.textContent = text;
        copy.classList.remove('is-done');
        void copy.offsetWidth;
        copy.classList.add('is-done');
        clearTimeout(copy._timer);
        copy._timer = setTimeout(function () { copy.textContent = 'Copy'; copy.classList.remove('is-done'); }, 1600);
      }
      function select() {
        var range = document.createRange();
        range.selectNodeContents(code);
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
        flash('Selected');
      }
      try {
        navigator.clipboard.writeText(source).then(function () { flash('Copied'); }, select);
      } catch (e) {
        select();
      }
    });
    tools.appendChild(copy);

    pre.parentNode.insertBefore(block, pre);
    face.appendChild(label);
    face.appendChild(tools);
    face.appendChild(pre);
    block.appendChild(face);
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
