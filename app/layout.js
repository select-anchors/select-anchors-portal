import localFont from "next/font/local";

const norwester = localFont({
  src: "/fonts/norwester.otf",
  variable: "--font-norwester",
  display: "swap",
});

const leagueSpartan = localFont({
  src: [
    {
      path: "/fonts/LeagueSpartan-VF.ttf",
      style: "normal",
      weight: "100 900", // variable range
    },
  ],
  variable: "--font-league",
  display: "swap",
});


import "./globals.css";
import Header from "./components/Header";
export const metadata = { title: "Select Anchors Portal", description: "Client login & operations" };
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        <main className="py-8">{children}</main>
      </body>
    </html>
  );
}
