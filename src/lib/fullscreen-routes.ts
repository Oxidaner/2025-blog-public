const FULLSCREEN_ROUTE_PREFIXES = ['/whiteboard']

export function isFullscreenRoute(pathname: string) {
	const cleanPathname = pathname.split('?')[0]?.replace(/\/+$/, '') || '/'

	return FULLSCREEN_ROUTE_PREFIXES.some(route => cleanPathname === route)
}
