export default function Footer() {
  return (
    <footer
      className="border-t border-brasa-brown/15 bg-brasa-brown-dark text-brasa-gold/80"
      style={{ contentVisibility: "auto", containIntrinsicSize: "1px 120px" }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>&copy; 2025 Brasaland. All rights reserved.</p>
        <p>
          <a
            href="https://instagram.com/brasaland"
            className="hover:text-brasa-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-gold"
          >
            Instagram
          </a>{" "}
          |{" "}
          <a
            href="https://facebook.com/brasaland"
            className="hover:text-brasa-gold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brasa-gold"
          >
            Facebook
          </a>
        </p>
      </div>
    </footer>
  );
}
