import "./globals.css";
import Header from "./components/Header";

// (Optional) If you wired local fonts earlier via next/font/local, keep those imports above

export const metadata = {
  title: "Select Anchors",
  description: "Portal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Header />
        {children}
      </body>
    </html>
  );
}
