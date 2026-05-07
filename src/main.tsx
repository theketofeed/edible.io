import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import './index.css'

Sentry.init({
	dsn: 'https://709a7c45faedbcee5c9f943425dd44bc@o4511351278403584.ingest.de.sentry.io/4511351286530128',
	environment: 'production',
	tracesSampleRate: 0.1,
})

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
