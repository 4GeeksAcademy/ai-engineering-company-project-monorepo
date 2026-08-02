export function SiteFooter() {
  return (
    <footer className="site-footer" id="contacto">
      <div>
        <p className="footer-title">Brasaland</p>
        <p>14 locales propios en Colombia y Florida.</p>
        <p className="small">© 2026 Brasaland. Todos los derechos reservados.</p>
      </div>
      <div>
        <p>Contacto corporativo</p>
        <a href="mailto:contacto@brasaland.com">contacto@brasaland.com</a>
      </div>
      <div>
        <p>Monedas operativas</p>
        <p>COP + USD</p>
        <div className="legal-links">
          <a href="#">Politica de privacidad</a>
          <a href="#">Terminos de uso</a>
        </div>
      </div>
    </footer>
  );
}
