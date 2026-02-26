import "./globals.css";
import Providers from "./providers";
import Header from "./components/Header";

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
