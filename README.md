# HIZARC Games — [hizarc.com](https://hizarc.com)

Source of **[hizarc.com](https://hizarc.com)**, the official website of **HIZARC Games**, the game studio of
[HIZARC](https://dev.hizarc.com) in Calicut (Kozhikode), Kerala, India.
React 19 + Vite + TypeScript + Tailwind CSS v4 + **Framer Motion**, mobile-first.

## Run it

| What | How |
| --- | --- |
| Start the local server | double-click **`start-website.bat`** (or `npm run dev`) → http://localhost:5173 |
| Build for production | double-click **`build-website.bat`** (or `npm run build`) → output in `dist/` |

Requires [Node.js](https://nodejs.org) 20+ (LTS). The first run installs dependencies automatically.

## Edit the content

Everything you'll want to change lives in two files — no component code needed:

- **`src/config/site.ts`**: contact email, location, social links, headline stats (**placeholder numbers, so replace them**), contact topics.
- **`src/data/games.ts`**: released games and upcoming games (**placeholder titles, so replace them**).
  - Every game gets animated, procedurally generated key art from its `palette` + `motif`.
    When you have real artwork, put it in `public/games/` and set `image: '/games/my-game.webp'` (+ `imageAlt`).
  - Store links: set `site`, `appStore`, `playStore`, `steam`, `web`, `trailer`. Remove a link to hide its button.
    A game with its own website (`site`, e.g. DEPTH CITY → https://depthcity.hizarc.com/) also gets a footer link and a
    VideoGame entry in the structured data.
  - Not out yet? Set `releaseStatus: 'Coming soon'`; it replaces the release year.
  - Upcoming games with an exact `releaseDate` show a live countdown. Otherwise set `releaseWindow` (e.g. `'Q3 2027'`).

## Contact form

Messages are sent to the **"HIZZARC GAMES" Google Form** (`googleForm` in `src/config/site.ts`), so they show up in the
form's *Responses* tab (click *Link to Sheets* there to collect them in a spreadsheet). Field mapping:

| Website field | Google Form question (entry id) |
| --- | --- |
| Name | Operative Alias (`entry.1192359696`) |
| Email | Comms Link Frequency (`entry.1865750333`) |
| Topic, company, budget + message | Encrypted Payload (`entry.1660048100`) |
| Date sent (IST) | Authorization Timestamp (`entry.2075667364`) |

Renaming the questions in Google Forms is safe (the entry ids stay the same). Deleting a question or changing its type
breaks the mapping, so update `site.ts` if you do. The form must stay open to responses from anyone, and no question may be
made *Required* (the site can't see Google's reply, so a rejected response would be lost silently). Turn on
*Responses → ⋮ → Get email notifications for new responses* to get an email for every message.

To use a different backend instead, set `googleForm.action` to `''` and either leave everything empty (the form then opens
the visitor's email app with a pre-filled message to the address in `site.ts`), or create a free form endpoint
(e.g. [Formspree](https://formspree.io), Web3Forms, Getform), copy `.env.example` to `.env` and set:

```
VITE_CONTACT_ENDPOINT=https://formspree.io/f/your-id
```

Rebuild after changing `.env`.

## Deploy to hizarc.com

The build output (`dist/`) is a static site, so it can be hosted anywhere.

**Current setup: GitHub Pages** (same account as dev.hizarc.com and depthcity.hizarc.com)
- `.github/workflows/deploy.yml` builds and publishes the site on every push to `main`.
- Repo *Settings → Pages*: Source **GitHub Actions**, Custom domain **hizarc.com**, **Enforce HTTPS** on.
  `www.hizarc.com` redirects to `hizarc.com` automatically.
- DNS at GoDaddy (hizarc.com), already in place:
  `A  @  →  185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153` and `CNAME  www  →  hyzamat.github.io`.
- To use a contact form endpoint instead of the Google Form, empty `googleForm.action` in `site.ts` and add a repo **variable** `VITE_CONTACT_ENDPOINT`
  (*Settings → Secrets and variables → Actions → Variables*), then re-run the workflow.

**Other hosts (Vercel / Netlify / Cloudflare Pages / cPanel):** build command `npm run build`, output directory `dist`,
add `hizarc.com` as the custom domain, and replace the A records above with the ones the host gives you.

## SEO & Google indexing

Goal: searching **"hizarc"** shows **hizarc.com** first. What the code already does on every build:

| What | Where |
| --- | --- |
| The whole page is **prerendered to static HTML** (search engines and AI crawlers see the real text without running JavaScript; the browser then takes over with React as before) | `src/entry-server.tsx`, `scripts/prerender.mjs` |
| Title, description, canonical, Open Graph / X cards, favicons, robots directives | `index.html` |
| Structured data (WebSite + Organization: name, logo, address, contact, parent company HIZARC, social profiles; a VideoGame published by the Organization for each game with its own website) | `src/seo/structuredData.ts`, generated from `src/config/site.ts` + `src/data/games.ts` |
| `sitemap.xml` with the date of the last commit | generated by `scripts/prerender.mjs` |
| Bing, Yandex & co. are pinged through **IndexNow** after each deploy (key file `public/b09c411fdf87e14be7c0215843f5c05c.txt`) | `.github/workflows/deploy.yml` |
| `robots.txt`, `llms.txt`, branded `404.html`, `favicon.ico` | `public/` |

**Social profiles matter:** put the real URLs in `socials` in `src/config/site.ts`. They show up in the footer and are added to the
Organization `sameAs` automatically, which is how Google confirms that the profiles and hizarc.com are the same company.

### One-time setup (needs your Google / GoDaddy / GitHub logins)

1. **Google Search Console** → [search.google.com/search-console](https://search.google.com/search-console) → *Add property* →
   **Domain** → `hizarc.com`. Copy the `google-site-verification=…` TXT record, add it in GoDaddy (*DNS → Add record → TXT*,
   name `@`), wait a few minutes, click *Verify*. Keep the record forever.
   (Alternative: a *URL prefix* property for `https://hizarc.com/` verified with the HTML-tag method: paste the
   `<meta name="google-site-verification" …>` tag into `index.html` where the comment says so, push, then verify.)
2. In Search Console: *Sitemaps* → submit `sitemap.xml`. Then *URL inspection* → `https://hizarc.com/` → *Test live URL* →
   *Request indexing*. Indexing usually takes a few days to two weeks.
3. **Bing Webmaster Tools** → [bing.com/webmasters](https://www.bing.com/webmasters) → *Import from Google Search Console*
   (covers Bing, Yahoo, DuckDuckGo and ChatGPT search, which uses Bing).
4. **GitHub repo** (`hyzamat/HIZARC-GAMEING`) → *About* ⚙ → *Website* `https://hizarc.com`, so the repo page links to the site.
5. **dev.hizarc.com** (repo `hyzamat/HIZARCWEBSITE`) currently says its canonical URL, `og:url`, sitemap and Organization `@id`
   are `https://hizarc.com/`. Change them to `https://dev.hizarc.com/` (and `https://dev.hizarc.com/#organization`), so Google
   doesn't treat the two sites as duplicates, and link to `https://hizarc.com` from it with the text "HIZARC Games".
6. Create or update official profiles (LinkedIn company page, YouTube, Instagram, X, …) with the **same name, "HIZARC Games"**, and
   a link to `https://hizarc.com`, then add them to `socials` (above). Add a Google Business Profile only if there is a real,
   staffed office in Calicut that visitors can go to.

Check the result with Google's [Rich Results Test](https://search.google.com/test/rich-results) and
[Schema Markup Validator](https://validator.schema.org) on `https://hizarc.com/`.

## Structure

```
src/
  config/site.ts          company info, socials, stats      ← edit
  data/games.ts           games + upcoming games            ← edit
  sections/               Hero, Ticker, Games, Stats, Upcoming, Studio, Contact
  components/layout/      Navbar, Preloader, Footer, ScrollProgress, CursorGlow, SmoothScroll
  components/ui/          Button, SectionHeading, Reveal, AnimatedWords, Tag, icons
  components/art/         GameArt (procedural key art)
  components/brand/       Logo (vector Hizarc "H" mark)
  seo/structuredData.ts   JSON-LD (WebSite + Organization) built from site.ts
  entry-server.tsx        renders the page to HTML at build time (prerender)
scripts/prerender.mjs     injects the prerendered HTML + JSON-LD into dist/, writes sitemap.xml
public/                   favicons, icons, logo, og-image, robots.txt, llms.txt, 404.html, IndexNow key
```
