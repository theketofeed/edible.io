/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./index.html', './src/**/*.{ts,tsx}'],
	theme: {
		extend: {
			colors: {
				lavender: '#C6A0F6',
				// Purple/Pink theme gradient colors
				purple: {
					50: '#faf5ff',
					100: '#f3e8ff',
					200: '#e9d5ff',
					300: '#d8b4fe',
					400: '#c084fc',
					500: '#a855f7',
					600: '#9333ea',
					700: '#7e22ce',
					800: '#6b21a8',
					900: '#581c87'
				},
				pink: {
					50: '#fdf2f8',
					100: '#fce7f3',
					200: '#fbcfe8',
					300: '#f8b4d4',
					400: '#f472b6',
					500: '#ec4899',
					600: '#db2777',
					700: '#be185d',
					800: '#9d174d',
					900: '#831843'
				}
			},
			borderRadius: {
				lg: '0.75rem'
			},
			boxShadow: {
				card: '0 8px 24px rgba(0,0,0,0.06)',
				// Glowing effects for purple/pink theme
				'glow-purple': '0 0 20px rgba(168, 85, 247, 0.3)',
				'glow-pink': '0 0 20px rgba(236, 72, 153, 0.3)',
				'glow-purple-lg': '0 0 40px rgba(168, 85, 247, 0.4)',
				'glow-pink-lg': '0 0 40px rgba(236, 72, 153, 0.4)'
			},
			fontFamily: {
				sans: ['Open Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
				display: ['Montserrat', 'ui-sans-serif', 'system-ui', 'sans-serif']
			},
			keyframes: {
				fadeIn: {
					'0%': { opacity: 0, transform: 'translateY(6px)' },
					'100%': { opacity: 1, transform: 'translateY(0)' }
				},
				float: {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-8px)' }
				},
				blob: {
					'0%, 100%': { transform: 'translate(0, 0) scale(1)' },
					'33%': { transform: 'translate(30px, -50px) scale(1.1)' },
					'66%': { transform: 'translate(-20px, 20px) scale(0.9)' }
				}
			},
			animation: {
				fadeIn: 'fadeIn 400ms ease-out both',
				float: 'float 3s ease-in-out infinite',
				blob: 'blob 7s infinite'
			},
			backdropBlur: {
				xs: '2px',
				md: '12px',
				xl: '20px'
			},
			borderColor: {
				// Custom border colors with opacity support
				'white/10': 'rgba(255, 255, 255, 0.1)',
				'white/20': 'rgba(255, 255, 255, 0.2)',
				'white/30': 'rgba(255, 255, 255, 0.3)',
				'purple/10': 'rgba(168, 85, 247, 0.1)',
				'purple/20': 'rgba(168, 85, 247, 0.2)',
				'pink/10': 'rgba(236, 72, 153, 0.1)',
				'pink/20': 'rgba(236, 72, 153, 0.2)'
			}
		}
	},
	plugins: []
}
