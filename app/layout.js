import "./globals.css";
import Header from "../components/Header";

export const metadata = {
  title: "Select Anchors Portal",
  description: "Client login & operations",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="body">
      <body>
        <Header />
        <main className="container py-8">{children}</main>
      </body>
    </html>
  );
}
