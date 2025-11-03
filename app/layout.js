// app/layout.js
import "./globals.css";
import Providers from "./providers";        // wraps NextAuth SessionProvider (and any others)
import Header from "./components/Header";   // can be a client component

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Select Anchors",
  description: "Portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
