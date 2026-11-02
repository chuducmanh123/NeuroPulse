import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Neurology & Stroke Journal Monitor | Multi-Journal Clinical Tracker",
  description:
    "Automated clinical research aggregator for Neurology & Stroke from NEJM, The Lancet, Lancet Neurology, JAMA, JAMA Neurology, Stroke, Neurology, and Annals of Neurology.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://europepmc.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.ncbi.nlm.nih.gov" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isDark = localStorage.getItem('neuro_dark_mode') === 'true' ||
                               localStorage.getItem('neuropulse_theme') === 'dark';
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
                window.tailwind = {
                  darkMode: 'class',
                  config: {
                    darkMode: 'class'
                  }
                };
              })();
            `,
          }}
        />
        <script src="https://cdn.tailwindcss.com"></script>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof tailwind !== 'undefined') {
                tailwind.config = {
                  darkMode: 'class',
                };
              }
            `,
          }}
        />
      </head>
      <body className="antialiased text-slate-900 bg-slate-100 dark:bg-slate-950 dark:text-slate-100">{children}</body>
    </html>
  );
}
