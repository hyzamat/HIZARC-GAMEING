import { prerender } from 'react-dom/static'
import App from './App'

export { buildStructuredData } from './seo/structuredData'

/**
 * Build-time entry (see scripts/prerender.mjs): renders the whole page to an HTML string that gets
 * written into dist/index.html, so crawlers and no-JS visitors see real content. The browser still
 * boots with createRoot (src/main.tsx, no hydration): React keeps this markup on screen until its
 * first commit. prerender() waits for any Suspense / React.lazy content, unlike renderToString.
 */
export async function render(): Promise<string> {
  const errors: unknown[] = []
  const { prelude } = await prerender(<App />, {
    // Errors inside a Suspense boundary would otherwise silently drop that part of the static HTML.
    onError: (error) => {
      errors.push(error)
    },
  })
  if (errors.length > 0) {
    // An AggregateError's stack does not list its inner errors, so spell them out in the message (the build log prints it).
    const causes = errors.map((error) => (error instanceof Error ? (error.stack ?? error.message) : String(error)))
    throw new AggregateError(errors, `Prerender hit ${errors.length} error(s):\n${causes.join('\n---\n')}`)
  }
  return new Response(prelude).text()
}
