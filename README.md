# Hizarc Games — hizarc.com

Official website of **Hizarc Games**, the game studio of [HIZARC](https://dev.hizarc.com).
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
    When you have real artwork, put it in `public/games/` and set `image: '/games/my-game.webp'`.
  - Store links: set `appStore`, `playStore`, `steam`, `web`, `trailer`. Remove a link to hide its button.
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
breaks the mapping, so update `site.ts` if you do. The form must stay open to responses from anyone.

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
- To use a contact form endpoint, add a repo **variable** `VITE_CONTACT_ENDPOINT`
  (*Settings → Secrets and variables → Actions → Variables*), then re-run the workflow.

**Google search:** add `hizarc.com` as a *Domain* property in [Google Search Console](https://search.google.com/search-console),
submit `https://hizarc.com/sitemap.xml`, then use *URL inspection → Request indexing* on `https://hizarc.com/`.

**Other hosts (Vercel / Netlify / Cloudflare Pages / cPanel):** build command `npm run build`, output directory `dist`,
add `hizarc.com` as the custom domain, and replace the A records above with the ones the host gives you.

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
public/                   favicon, icons, og-image, robots.txt, sitemap.xml
```
