# Design

How this site looks, how it speaks, and how to add to it. Values (colours, sizes, spacing) live in [css/site.css](css/site.css) and are not repeated here; this file holds the reasons and conventions the stylesheet cannot state.

## What the site is for

The site is about Atilla. It answers "who is the person behind this name?" for someone who followed a link from GitHub, a PyPI page, a release note or a blog post. It has three jobs:

1. Say who he is, in a sentence or two, in his own voice.
2. Point to the work and describe it.
3. Be the home of his writing, once the blog exists.

The libraries are presented in full at [blipbox.io](https://blipbox.io). This site introduces their author.

## How the site is built

Every page is a complete, hand-written HTML file. There is no generator, no Markdown source and no include mechanism, so that each page can be built for its own content.

- **Shared chrome is copied.** The `<head>` block, the band with its nav, and the footer are repeated in each page. When one changes, change it in every `*.html` file.
- **One stylesheet.** `css/site.css` styles everything shared. A page that needs something of its own (a figure, a demo) carries it in an inline `<style>` or `<script>`, built from the tokens. Move it into `site.css` when a second page needs it.
- **One shared script.** `js/site.js` is loaded with `defer` at the end of every page and holds the analytics consent logic.
- **JavaScript enhances.** A page reads complete without it. Controls that only work with script start with the `hidden` attribute and the script reveals them.
- **Paths are root-absolute** (`/css/site.css`, `/images/favicon.svg`) in every page.
- **Third-party requests:** the IBM Plex Mono stylesheet from Google Fonts on every visit, and Google Analytics only after the visitor accepts.

## Analytics and consent

Measuring visits matters less than leaving the reader alone, so the default is no measurement.

- **Nothing from Google Analytics loads until the visitor accepts.** The loader, the measurement ID and the choice all live in `js/site.js`.
- **The question arrives late and slowly.** Ten seconds after load a small box drifts into the bottom-right corner. It takes no focus, covers no controls and blocks nothing.
- **One answer is remembered** in the browser's `localStorage`, so the box appears once. A browser sending the Global Privacy Control signal has answered no and is never asked.
- **Every page footer carries** `<button type="button" class="textbtn" data-consent-open hidden>analytics settings</button>`, which reopens the box so a visitor can change their answer.
- **Local previews never send visits**, whatever the stored choice. On a local address the events are collected in `window.__tracked` so they can be checked in the console.
- **Only measurement is agreed to.** When Google's script loads it is told that analytics storage is granted and that every advertising signal is denied.

**Events.** Page views, outbound link clicks and scroll depth come from GA4's own enhanced measurement, so the site adds only what that cannot see. There are three events. Markup declares the first two; pages do not call Google directly.

| Event | When | Parameters | Markup |
|---|---|---|---|
| `share` (a GA4 recommended event) | A button in the pass-it-on panel is pressed | `method`: `copy_link`, `native`, `x` or `bluesky`; `content_type`: `article`; `item_id`: the post's slug | `data-track="share" data-track-method="x"` |
| `demo_interaction` | A reading device or demo is used | `demo_name`: which one; `demo_action`: `type`, `example`, `copy`, `toggle` or `replay` | `data-track="demo_interaction" data-track-demo="pipeline" data-track-action="example"` on a button, or on the box that holds several |
| `theme_change` | The theme switch is pressed | `theme`: `light` or `dark`, the theme switched to | None; `js/site.js` sends it |

- A text field takes `data-track-input="demo_interaction" data-track-demo="…"`. It reports once per page view that the field was used. **What a visitor types is never sent.**
- Every new button, example chip and text field in a device gets these attributes. A new `demo_name` is lower case with underscores and names the device, not the post.
- Add `?ga_debug` to an address to see events arrive in GA4's DebugView.
- In GA4, `demo_name`, `demo_action` and `theme` are registered as event-scoped custom dimensions, each with the event parameter of the same name. A new parameter needs the same.

`demo_name` values in use: `sluggi_demo` (homepage); `signup_scene`, `stranger_reveal`, `name_checker`, `skeleton_compare` (look-alike names post); `hidden_issue`, `issue_steps`, `intake` (guild post); `address_scene`, `pipeline` (slug post); `fetched_files` (hand-written site post); `code_block` (Copy and Show results on any code block).
- The box is the one place the yellow and pale button pair appears together: yellow for yes, pale for no, the same size side by side.

## Search engines and agents

Every page is written to be read by a crawler or an agent as easily as by a person. `index.html` is the reference for the `<head>`.

**Each indexable page carries:**

- `<html lang="en-GB">` and a `<title>` unique to the page, the subject first and `· Atilla Guzel` after it, around 50 to 60 characters.
- A `description` of one or two sentences, up to 160 characters, that states what the page says.
- A `canonical` link to the page's own full address.
- The Open Graph tags (`og:type`, `og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale`, `og:image` with its width, height and alt) and `twitter:card`.
- The three icon links: `favicon.svg`, `favicon.png` and `apple-touch-icon.png`.
- A JSON-LD block. The homepage describes the `Person`; a post is a `BlogPosting` with `headline`, `datePublished`, `dateModified`, `description`, and `author` pointing at `https://atillaguzel.github.io/#person`.

**In the body:**

- One `h1` that names the subject in words, then `h2` and `h3` in order with no level skipped. The homepage `h1` shows one word large and carries the sentence naming Atilla inside the same element.
- All content is in the HTML as served. Script may enhance it and never supplies it.
- Landmarks are real elements: `header`, `nav`, `main`, `article`, `section` with a heading, `footer`.
- Images have `alt` text that says what they show; a meaningful inline SVG has `role="img"` and an `aria-label`.
- Dates are `<time datetime="YYYY-MM-DD">`.
- Link text says where the link goes.

**Site files, updated whenever a page is added, moved or removed:**

| File | What to change |
|---|---|
| `sitemap.xml` | Add the page's address and `lastmod` |
| `llms.txt` | Add the page under the right heading with a one-line summary. This is the plain-text map of the site for agents |
| `robots.txt` | Nothing, unless a path should be kept from crawlers |

Pages that should stay out of search (`404.html`, the `/resume/` redirect) carry `<meta name="robots" content="noindex">` and are left out of the sitemap.

## Look

**Tones.** Every colour reaches markup through a token defined on `:root`. Dark mode redefines the same tokens, so a component built from tokens is dark-ready with no extra work.

| Token | Role |
|---|---|
| `--paper` | The page ground and the inside of panels |
| `--band` | The teal block that opens every page |
| `--ink` | Headings, labels and focus rings |
| `--edge` | Every drawn line: borders, rules, rings |
| `--panel` | The face of a panel |
| `--text` | Running text |
| `--pen` | Graphics only: the logo, list markers, the prompt glyph. Too light for small text |
| `--mark` | The marker: the highlighter stroke under text links |
| `--btn`, `--on-btn` | The yellow fill and the text on it |
| `--btn-alt`, `--on-btn-alt` | The pale button and its text |
| `--shade`, `--shade-o` | The stipple's colour and strength |
| `--mist`, `--line`, `--muted` | Quiet fills, hairlines, secondary text |

**Dark is its own palette, not the light one inverted.** On white, the yellow and the pale buttons sit close to the page and are quiet. Carried over unchanged they would be the brightest things on a dark page. So in dark the yellow deepens to amber, the pale button becomes a dark surface with light text, lines soften from `--ink` to a mid teal-grey so that borders read as ink and not as glowing wire, and panels sit one step lighter than the page. A new component draws its lines with `--edge` and its panel faces with `--panel`, never `--ink` or `--paper`, and then needs no dark rules of its own.

**The theme switch.** The site follows the visitor's device until they press the sun-and-moon switch at the end of the header nav.

- The dark palette is written twice in `css/site.css`: once for a device that asks for dark, once for `data-theme="dark"` on the root. Change a dark token in both places.
- A choice is kept in the browser's `localStorage` as `theme`. Choosing the theme the device already asks for clears it, so the site goes back to following the device.
- Every page has a three-line script in its `<head>`, straight after the `color-scheme` meta tag, that applies a stored choice before anything is painted. It is the one script that must run early; copy it with the rest of the head.
- The switch itself is the last `<li>` in the nav, a `<button class="theme">` that starts `hidden`. Copy it from `index.html`.
- While the palette changes, the root carries `theme-fading` for a third of a second so every colour fades together.

**Type.** Two faces, both monospace. iA Writer Duospace sets running text; only its regular weight is in the repo. IBM Plex Mono, the face Duospace is drawn from, sets everything bold: headings, labels, buttons, code. Anything heavier than 400 uses `--font-display`.

**Case.** Interface labels are lowercase: the nav, panel labels, the homepage section headings. Titles and prose are sentence case: post titles, post headings, body text.

**The mark** is a pen nib that writes a short line, drawn with the same straight ink strokes as the borders. It plays once on load and again when the brand is pointed at. Copy the `<a class="brand">` block from `index.html` into every page. `images/favicon.svg`, `favicon.png` and `apple-touch-icon.png` are the same mark on the band colour, and `images/og.png` is the social preview card.

**Shape.** Borders are 2px ink with square corners. Buttons and chips take a 3px radius. Depth comes from the stipple alone.

**The stipple means "you can act on this".** A named thing gets a labelled panel (`.panel` with a `.label` set into its top border). Wrap the panel in `.stip` only when it links somewhere or holds controls. A panel that is only read, such as a note in a post, stays flat.

**Yellow is scarce.** A page has at most one `.btn`, for its main action; the homepage has none. Other buttons are `.btn--alt`. The consent box is the exception described above. Text links carry the marker (`.mk`, or automatically inside `.post`).

**Motion.** Hover and press respond in 120ms. Everything else changes instantly.

**Measure.** `.wrap` sets the page width; running text sits in a 65-character column (`.prose`, `.post`).

## Voice

The voice is **story first, then the host**. Atilla chose it from two rounds of specimens. It has two movements, and the order matters.

1. **The story.** A piece opens inside a small scene: one person doing one thing, in the present tense, with nobody introducing it. "It is late, and somebody is filling in a sign-up form."
2. **The host.** A few sentences in, the writer turns to the reader as "you" and offers to show them something. "Now come back to this page and look at its title. I'll show you."

From there the two alternate. The host explains, warmly and exactly, and the story returns as a thread: "Back to our visitor at the form." The last paragraph goes back to the opening scene and closes it.

**How it sounds**

- Warm and unhurried, one reader at a time. "You" throughout, "I" sparingly and mostly to offer something.
- Short plain sentences beside a longer one. Everyday words; a technical term is named once and then used.
- Technical passages are told as what happens to the person in the story, then shown as code: "You can do the same in two lines."
- A headline names what the page is about.

**The people in the story are invented and say so by being anonymous**: somebody, a visitor, an editor, a stranger. Atilla's own experience appears only where he has supplied it.

**It never sells.** A claim carries its evidence or a link to it, numbers come from the project's own README, and the reader is left to judge the work. The site once opened with the headline "read every change", and Atilla's verdict was that it read as an ad.

The homepage, the consent box and other interface text use the host half only: plain, warm, first person.

## Reading devices

A post is built with small interactions that let the reader see the thing happen. They are part of the writing.

- **A device enacts the sentence beside it.** The form in the story types the name; the reader presses to see the hidden letter. A device with no sentence to enact is decoration and is left out.
- **The reader starts what matters.** Reveals wait for a press. Motion that plays unasked plays once, when its device scrolls into view, and offers Replay.
- **The page is complete at rest.** With script off or motion reduced, every device shows its finished state and every word is on the page.
- **Motion is short and quiet.** A few hundred milliseconds, nothing looping, nothing that moves while the reader is reading the paragraph next to it.
- Shared device parts (`.aid`, `.field`, `.verdict`, `.tag`, `.imp`) live in `css/site.css`. Anything one post alone needs stays in that post.

## Content decisions

- Contact routes are LinkedIn and GitHub.
- Career history lives on LinkedIn. `/resume/` redirects to the homepage so old links keep working.
- The work shown is the public libraries under the `blip-box` organisation.

## Blog

Posts follow the look above. Each one is built as its own HTML page and may carry one purposeful piece of its own, such as an interactive figure.

**Addresses.** The index is `/blog/index.html`. A post lives at `/blog/<slug>/index.html`, where the slug is the title in lowercase words joined by hyphens.

**A post page:**

```html
<header class="band band--page">
  <div class="wrap">
    <nav class="top" aria-label="Main">
      <a class="brand" href="/"><!-- the mark, copied from index.html --> atilla guzel</a>
      <ul>
        <li><a href="/#work">work</a></li>
        <li><a href="/blog/">blog</a></li>
      </ul>
    </nav>
    <h1>Post title in sentence case</h1>
    <p class="meta"><time datetime="2026-11-18">18 November 2026</time></p>
  </div>
</header>

<main class="wrap">
  <article class="post">
    <p>Opening paragraph.</p>
    <h2>Section heading</h2>
    …
    <aside class="stip share" aria-labelledby="share-h">… the pass-it-on panel …</aside>
    <hr>
    <p><a href="/blog/">&larr; all posts</a></p>
  </article>
  <footer>… the analytics settings button …</footer>
</main>
<script src="/js/site.js" defer></script>
```

The `<head>` follows "Search engines and agents" above, with the title as `Post title · Atilla Guzel` and `og:type` set to `article`.

**Elements a post can use**, all styled under `.post`:

| Element | Markup | Use it for |
|---|---|---|
| Headings | `h2`, `h3` | Sections and sub-sections |
| Code | `<code>`, `<pre><code>` | Inline names, and blocks of code as plain text |
| List | `ul`, `ol` | Items that are each a full thought |
| Quotation | `blockquote` with `p` and `cite` | Someone else's words |
| Note | `<aside class="note">` with `<h3 class="label">` | A caveat or definition the reader may skip |
| Figure | `figure` with `img`, `svg` or `canvas`, and `figcaption` | Diagrams and images. Draw SVG with the tokens |
| Table | `<div class="scroll"><table>` | Facts compared across rows |

**Code blocks never scroll sideways.** Three things make that so, in this order:

1. Write code to fit. Keep every line in a block to about 66 characters, breaking a long call across lines the way a formatter would.
2. On a wide screen a block grows past the reading column into the page's spare width.
3. Where a line still does not fit, as on a phone, `js/site.js` wraps it under itself, indented past its own indent and marked with a small arrow. Copying gives the code exactly as written.

**A code block is a labelled panel.** With script, each block gets the language set into its top border, a Copy button on the border opposite, the stippled shadow, and comments in the muted colour. Without script it is a plain bordered box.

- Name the language on the block: `<pre data-lang="python">`.
- Where a block shows calls and what they return, add `data-results` and write each return value as a trailing comment, `call()   # value`. Those values start covered, and a Show results button uncovers them one after another. Use it only when the comments are results; ordinary comments stay as they are.
- The text of a block is never altered, so copying it, by the button or by selecting, gives the code exactly as written.

Author a block as plain `<pre><code>` text. The script adds the per-line markup. A trailing comment stays with its `#`, so a wrapped row breaks before the comment and never inside its opening.

**Tables do not scroll sideways on a phone either.** Below 36rem each row stacks into a small block: the first cell becomes the row's title, and every other cell shows its column name above its value. Author a table as `<div class="scroll"><table>` with a `<thead>`, and put the thing each row is about in the first column. `js/site.js` copies the column names onto the cells.

**Every post closes with the pass-it-on panel**, after the last paragraph and before the link back to the list. Copy it from an existing post and change three things: the address in `.addr`, and the title and address inside the two share links, percent-encoded.

- The X and Bluesky buttons are plain links that open the reader's own compose window. Nothing is loaded from either service.
- Copy link and the device's own Share button need script, so they start `hidden` and `js/site.js` reveals them. The address is always shown as text that selects in one press.
- Copy link is the post's one yellow button.

**The index** is an `<ol class="posts">`, newest first. Each entry is a `<time>` in ISO form, the title as an `.mk` link, and one sentence saying what the post is about.

**Adding a post:**

1. Create `/blog/<slug>/index.html`, starting from an existing post, and write it.
2. Add its entry at the top of the list in `/blog/index.html` and in the `writing` section of the homepage.
3. Add it to `sitemap.xml` and `llms.txt`.
4. Preview it at phone width (375px) and in both colour schemes.

The post is done when it has no sideways page scroll at 375px, reads clearly in light and dark, appears first in both lists, is in both site files, and every link in it resolves.

**What a post may claim.** A post speaks as Atilla, so it states only what he has said or what the project's own repository shows. Library output quoted in a post is run against the released package first, and an in-page demo says plainly that it is an approximation.
