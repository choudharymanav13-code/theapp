import './globals.css'
import BottomNav from '../components/BottomNav'   // 👈 import must be here, at the top

export const metadata = {
  title: 'Pantry Coach',
  description: 'Your smart pantry & calorie companion'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#22c55e" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <div className="container">
          {children}
        </div>

        {/* Bottom navigation (only if logged in) */}
        <BottomNav />

        {/* Register service worker (PWA) */}
        <script dangerouslySetInnerHTML={{__html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js').catch(()=>{});
            });
          }
        `}} />
      </body>
    </html>
  )
}
