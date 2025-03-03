import React from 'react'
import './globals.css'
import { Toaster } from 'react-hot-toast'
import { Roboto } from 'next/font/google'

const roboto = Roboto({ 
  weight: ['400', '700'],
  subsets: ['latin']
})

export const metadata = {
  title: 'Comunicação ADV7',
  description: 'Sistema de gerenciamento de comunicação da igreja',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={roboto.className}>
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
        <Toaster position="top-right" />
      </body>
    </html>
  )
} 