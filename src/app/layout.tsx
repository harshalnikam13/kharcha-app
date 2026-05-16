import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Kharcha — Personal Expense Tracker',
  description: 'Track your income and expenses with AI-powered SMS parsing',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
