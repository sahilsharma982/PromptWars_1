import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';
import './globals.css';
import NavBar from '@/components/NavBar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const lora = Lora({ subsets: ['latin'], variable: '--font-newsreader' });

export const metadata: Metadata = {
  title: 'MindSpace AI | Student Well-being',
  description: 'AI-powered mental well-being platform for high-stakes exam students (JEE/NEET/UPSC). Features a multi-agent Hive chatbot, mood journal, AI syllabus organizer, sleep tracking integrations, and a smart calendar.',
  keywords: ['student wellness', 'AI study assistant', 'JEE preparation', 'NEET prep', 'mood tracker', 'exam stress', 'multi-agent AI'],
  authors: [{ name: 'MindSpace AI' }],
  openGraph: {
    title: 'MindSpace AI',
    description: 'Your AI well-being companion for high-stakes exam preparation.',
    type: 'website',
  },
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#FDFCF8]">
      <body className={`${inter.variable} ${lora.variable} font-sans bg-[#FDFCF8] text-[#27272A] min-h-screen selection:bg-[#D97757]/20`}>
        {/* Skip navigation for keyboard / screen reader users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-white focus:text-[#27272A] focus:rounded-lg focus:shadow-lg focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>
        <NavBar />
        <main id="main-content" role="main" aria-label="Page content" className="px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
