import './globals.css'
import BottomNav from '../components/BottomNav'

export const metadata = {
  title: 'Pantry Coach',
  description: 'Your smart pantry & calorie companion'
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        <BottomNav />
      </body>
    </html>
  )
}
