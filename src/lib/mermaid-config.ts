export const MERMAID_RENDER_CONFIG = {
	startOnLoad: false,
	securityLevel: 'strict',
	theme: 'neutral',
	maxTextSize: 90000,
	flowchart: {
		useMaxWidth: false,
		htmlLabels: true,
		wrappingWidth: 260,
		nodeSpacing: 60,
		rankSpacing: 70
	},
	sequence: {
		useMaxWidth: false,
		wrap: true,
		width: 180
	},
	themeVariables: {
		fontFamily: 'Arial, sans-serif',
		fontSize: '15px',
		primaryTextColor: '#1f2937'
	}
} as const
