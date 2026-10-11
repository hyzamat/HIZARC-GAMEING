# Hizarc Games — games.hizarc.com

Official website of **Hizarc Games**, the game studio of [HIZARC](https://hizarc.com).
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

By default the form opens the visitor's email app with a pre-filled message to the address in `site.ts`.
To receive submissions directly, create a free form endpoint (e.g. [Formspree](https://formspree.io), Web3Forms, Getform),
then copy `.env.example` to `.env` and set:

```
VITE_CONTACT_ENDPOINT=https://formspree.io/f/your-id
```

Rebuild after changing `.env`.

## Deploy to games.hizarc.com

The build output (`dist/`) is a static site, so it can be hosted anywhere.

**Current setup: GitHub Pages** (same as dev.hizarc.com and depthcity.hizarc.com)
- `.github/workflows/deploy.yml` builds and publishes the site on every push to `main`.
- Repo *Settings → Pages*: Source **GitHub Actions**, Custom domain **games.hizarc.com**, **Enforce HTTPS** on.
- DNS at GoDaddy (hizarc.com): `CNAME  games  →  hyzamat.github.io`.
- To use a contact form endpoint, add a repo **variable** `VITE_CONTACT_ENDPOINT`
  (*Settings → Secrets and variables → Actions → Variables*), then re-run the workflow.

**Option A: Vercel / Netlify / Cloudflare Pages (free)**
1. Push this folder to a Git repo and import it (build command `npm run build`, output directory `dist`),
   or drag and drop the `dist` folder into Netlify Drop.
2. Add the custom domain `games.hizarc.com` in the host's dashboard.
3. At your DNS provider for hizarc.com, add the record the host tells you to add, usually:
   `CNAME  games  →  <your-project>.vercel.app` (or `.netlify.app` / `.pages.dev`).

**Option B: the same cPanel/hosting as hizarc.com**
1. In cPanel → *Domains / Subdomains*, create `games.hizarc.com` (document root e.g. `public_html/games`).
2. Run `build-website.bat`, then upload **the contents of** `dist/` into that folder.
3. Enable SSL for the subdomain (cPanel → *SSL/TLS Status* → AutoSSL).

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
