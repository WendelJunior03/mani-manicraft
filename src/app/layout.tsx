// src/app/layout.tsx
// JAPA — layout raiz do App Router.
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Mani Manicraft',
  description: 'Clone de Minecraft para Web — MVP (Next.js + React Three Fiber)',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
