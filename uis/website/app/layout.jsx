import "./globals.css";

export const metadata = {
  title: "Brasaland | Cocina a la brasa",
  description: "Cocina a la brasa para compartir, desde Medellin desde 2008.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}