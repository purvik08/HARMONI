import type { Metadata } from 'next';
import './globals.css';

// TODO: Cache Components adoption. Refactor this route so this opt-out can be removed.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

export const metadata: Metadata = {
  title: 'HARMONI — Decentralized AMR Fleet Simulation (SIH26123)',
  description:
    'Edge-AI Distributed Fleet Coordination for Autonomous Mobile Robots. Complete browser-based digital twin deployable on Vercel.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0d1210] text-[#dfe8e3] antialiased">
        {children}
      </body>
    </html>
  );
}
