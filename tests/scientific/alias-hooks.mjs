/**
 * Resolve the repo's `@/` alias so Node's type-stripping loader can import
 * scientific ingestion modules without a vitest install.
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    const url = new URL(`../../src/${specifier.slice(2)}.ts`, import.meta.url);
    return nextResolve(url.href, context);
  }
  return nextResolve(specifier, context);
}
