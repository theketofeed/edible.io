/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./index.html', './src/**/*.{ts,tsx}'],
	theme: {
		extend: {
			colors: {
				lavender: '#C6A0F6'
			},
			borderRadius: {
				lg: '0.75rem'
			},
			boxShadow: {
				card: '0 8px 24px rgba(0,0,0,0.06)'
			},
			fontFamily: {
				sans: ['Open Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				display: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif']
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: 0, transform: 'translateY(6px)' },
					'100%': { opacity: 1, transform: 'translateY(0)' }
				}
			},
			animation: {
				fadeIn: 'fadeIn 400ms ease-out both'
			}
		}
	},
	plugins: []
}

