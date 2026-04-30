type EnvLike = Record<string, string | undefined>

const DEFAULT_SITE_ORIGIN = 'http://localhost:3000'
const CANONICAL_SITE_ORIGIN = 'https://website.oxidaner.shop'

function normalizeOrigin(value: string): string {
	const raw = value.trim()
	if (!raw) return DEFAULT_SITE_ORIGIN
	const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`

	try {
		return new URL(withProtocol).origin
	} catch {
		return DEFAULT_SITE_ORIGIN
	}
}

export function getSiteOrigin(env: EnvLike = process.env, canonicalSiteOrigin = CANONICAL_SITE_ORIGIN): string {
	const configured = env.SITE_URL || env.NEXT_PUBLIC_SITE_URL || canonicalSiteOrigin || env.VERCEL_URL || env.CF_PAGES_URL
	return configured ? normalizeOrigin(configured) : DEFAULT_SITE_ORIGIN
}

export function toAbsoluteSiteUrl(value: string, env: EnvLike = process.env, canonicalSiteOrigin = CANONICAL_SITE_ORIGIN): string {
	if (/^[a-z][a-z\d+.-]*:/i.test(value)) return value
	const origin = getSiteOrigin(env, canonicalSiteOrigin)
	const path = value.startsWith('/') ? value : `/${value}`
	return `${origin}${path}`
}
