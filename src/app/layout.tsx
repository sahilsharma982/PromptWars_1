import type { Metadata } from 'next';
import { Inter, Lora } from 'next/font/google';
import './globals.css';
import NavBar from '@/components/NavBar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const lora = Lora({ subsets: ['latin'], variable: '--font-newsreader' });

export const metadata: Metadata = {
  title: 'MindSpace AI | Student Well-being',
  description: 'AI-powered mental well-being app for high-stakes exam students.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="bg-[#FDFCF8]">
      <body className={`${inter.variable} ${lora.variable} font-sans bg-[#FDFCF8] text-[#27272A] min-h-screen selection:bg-[#D97757]/20 transition-colors duration-500`}>
        <NavBar />
        <main className="px-4 sm:px-6 lg:px-8">
          {children}
        </main>
      </body>
    </html>
  );
}
