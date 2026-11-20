import type { Metadata } from "next";
import "./globals.css";
import { EcosystemRail } from "@/components/ecosystem/EcosystemRail";

export const metadata: Metadata = {
  title: "Neuro Ecosystem — Clinical & Research Suite",
  description:
    "Unified clinical & research suite for Neurology & Stroke: NeuroPulse Journal Monitor, NeuroCase, NeuroGuide, NeuroRx, and NeuroVision.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400;1,600&family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,500;0,6..72,600;0,6..72,700;1,6..72,500;1,6..72,600&family=Playfair+Display:ital,wght@0,600;0,700;1,600;1,700&display=swap"
          rel="stylesheet"
        />
        <link rel="preconnect" href="https://europepmc.org" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://www.ncbi.nlm.nih.gov" crossOrigin="anonymous" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var isDark = localStorage.getItem('neuro_dark_mode') === 'true' ||
                               localStorage.getItem('neuropulse_theme') === 'dark' ||
                               localStorage.getItem('neurorx_theme') === 'dark' ||
                               localStorage.getItem('neurocase_theme') === 'dark';
                  if (isDark) {
                    document.documentElement.classList.add('dark', 'night-shift');
                  } else {
                    document.documentElement.classList.remove('dark', 'night-shift');
                  }
                } catch (e) {}
                window.tailwind = {
                  darkMode: 'class',
                  config: {
                    darkMode: 'class',
                    theme: {
                      extend: {
                        fontFamily: {
                          sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
                          serif: ['"Playfair Display"', 'Georgia', 'serif'],
                          mono: ['"JetBrains Mono"', 'monospace'],
                        }
                      }
                    }
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
                  theme: {
                    extend: {
                      fontFamily: {
                        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
                        serif: ['"Playfair Display"', 'Georgia', 'serif'],
                        mono: ['"JetBrains Mono"', 'monospace'],
                      }
                    }
                  }
                };
              }
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-[var(--bg-paper)] text-[var(--text-ink)]">
        <EcosystemRail>{children}</EcosystemRail>
      </body>
    </html>
  );
}
