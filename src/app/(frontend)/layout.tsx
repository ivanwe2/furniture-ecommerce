import React from 'react'
import './styles.css'
import { FontProvider } from '@/components/providers/font-provider'

export const metadata = {
  description: 'Настех — мебелен обков',
  title: 'Настех — мебелен обков',
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  return (
    <html lang="bg">
      <body>
        <FontProvider>
          <main>{children}</main>
        </FontProvider>
      </body>
    </html>
  )
}
