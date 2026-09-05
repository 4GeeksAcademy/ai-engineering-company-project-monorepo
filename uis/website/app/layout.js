import "./globals.css";

export const metadata = {
  title: "TrackFlow | Faster routes, smarter deliveries",
  description:
    "TrackFlow is a logistics partner for warehousing, inventory management, order fulfillment, and last-mile delivery across the United States and Spain.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
