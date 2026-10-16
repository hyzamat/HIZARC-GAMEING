/**
 * schema.org JSON-LD (WebSite + WebPage + Organization + a VideoGame per game website) for the homepage.
 * Built from src/config/site.ts at build time and injected into the static HTML by scripts/prerender.mjs.
 * Real social profile URLs added to `socials` in site.ts flow into Organization.sameAs automatically;
 * placeholder '#' entries are skipped (and sameAs is left out entirely while none are real).
 */
import { engines, site, socials } from '@/config/site'
import { games, platformLabels } from '@/data/games'

/** Homepage URL with exactly one trailing slash: 'https://hizarc.com' → 'https://hizarc.com/'. */
const withSlash = (url: string) => `${url.replace(/\/+$/, '')}/`

/**
 * One VideoGame per game with its own website (links.site in data/games.ts). The @id is the one that site
 * publishes itself (e.g. https://depthcity.hizarc.com/#game), so search engines merge both descriptions
 * and connect the game to this Organization through `publisher`.
 */
function gameNodes(home: string, organization: { '@id': string }) {
  return games.flatMap((g) => {
    const href = g.links.site?.trim() ?? ''
    if (!/^https?:\/\//i.test(href)) return []
    const url = withSlash(href)
    return [
      {
        '@type': 'VideoGame',
        '@id': `${url}#game`,
        name: g.title,
        url,
        description: g.description,
        ...(g.image && { image: new URL(g.image, home).href }),
        genre: g.genre,
        gamePlatform: g.platforms.map((p) => platformLabels[p]),
        applicationCategory: 'Game',
        publisher: organization,
        ...(g.profiles?.length && { sameAs: g.profiles }),
      },
    ]
  })
}

export function buildStructuredData(page: { title: string; description: string }): object {
  const home = withSlash(site.url)
  const parentHome = withSlash(site.parentUrl)
  const id = (fragment: string) => ({ '@id': `${home}#${fragment}` })

  const sameAs = socials.map((s) => s.href).filter((href) => /^https?:\/\//i.test(href))
  const ownGames = gameNodes(home, id('organization'))
  const gameRefs = ownGames.map((g) => ({ '@id': g['@id'] }))

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        ...id('website'),
        url: home,
        name: site.name,
        alternateName: ['HIZARC', 'Hizarc Games', 'hizarc.com'],
        description: page.description,
        inLanguage: 'en',
        publisher: id('organization'),
      },
      {
        '@type': 'WebPage',
        ...id('webpage'),
        url: home,
        name: page.title,
        description: page.description,
        isPartOf: id('website'),
        about: id('organization'),
        primaryImageOfPage: id('ogimage'),
        ...(gameRefs.length > 0 && { mentions: gameRefs }),
        inLanguage: 'en',
      },
      {
        '@type': 'ImageObject',
        ...id('ogimage'),
        url: `${home}og-image.png`,
        contentUrl: `${home}og-image.png`,
        width: 1200,
        height: 630,
        caption: `${site.name} — ${site.tagline}`,
      },
      {
        '@type': 'Organization',
        ...id('organization'),
        name: site.name,
        alternateName: ['Hizarc Games', 'HIZARC Game Studio'],
        url: home,
        logo: {
          '@type': 'ImageObject',
          ...id('logo'),
          url: `${home}logo-600.png`,
          contentUrl: `${home}logo-600.png`,
          width: 600,
          height: 600,
          caption: site.name,
        },
        image: id('ogimage'),
        description: site.description,
        slogan: site.tagline,
        email: site.email,
        address: { '@type': 'PostalAddress', addressLocality: 'Kozhikode', addressRegion: 'Kerala', addressCountry: 'IN' },
        areaServed: 'Worldwide',
        knowsAbout: [
          'Video game development',
          'Mobile games',
          'PC games',
          'WebGL games',
          'Augmented reality',
          'Virtual reality',
          'Game co-development',
          ...engines,
        ],
        contactPoint: [
          {
            '@type': 'ContactPoint',
            contactType: 'business inquiries',
            email: site.email,
            url: `${home}#contact`,
            areaServed: 'Worldwide',
            availableLanguage: ['English'],
          },
        ],
        parentOrganization: { '@type': 'Organization', '@id': `${parentHome}#organization`, name: site.parentName, url: parentHome },
        ...(sameAs.length > 0 && { sameAs }),
      },
      ...ownGames,
    ],
  }
}
