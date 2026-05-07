import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'
import posthog from 'posthog-js'

posthog.init('phc_AXP8PV69MvddHZnRbyuItedeuFZ9n9lznYo0uotTbsq', {
	api_host: 'https://eu.i.posthog.com',
	capture_pageview: true
})

ReactDOM.createRoot(document.getElementById('root')!).render(
	<React.StrictMode>
		<AuthProvider>
			<App />
		</AuthProvider>
	</React.StrictMode>
)
