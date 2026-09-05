import "./globals.css";

export const metadata = {
  title: "TrackFlow Backoffice",
  description: "Internal operations view for TrackFlow warehouse and carrier planning.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
