import { useEffect } from "react";
import { TALENT_PATH } from "./router";

export const ORIGIN = "https://nexova.com";

// The home values are the ones index.html ships with; /talento replaces them when the visitor navigates to it.
export const PAGES: Record<string, { title: string; description: string; path: string }> = {
  "/": {
    title: "Nexova | Construimos equipos excepcionales",
    description: "Nexova conecta empresas en crecimiento con talento excepcional mediante headhunting, outsourcing y formación corporativa.",
    path: "/",
  },
  [TALENT_PATH]: {
    title: "Únete a nuestro banco de talento | Nexova",
    description: "Envía tu perfil al banco de talento de Nexova: oportunidades en tecnología, retail y servicios financieros.",
    path: TALENT_PATH,
  },
};

function setHead(selector: string, create: () => HTMLElement, attribute: string, value: string) {
  const element = document.head.querySelector<HTMLElement>(selector) ?? document.head.appendChild(create());
  element.setAttribute(attribute, value);
}

/** Keeps the title, description and canonical URL in step with the page shown (the site is one HTML file, two routes). */
export function usePageMeta(path: string) {
  useEffect(() => {
    const page = PAGES[path] ?? PAGES["/"];
    document.title = page.title;
    setHead('meta[name="description"]', () => Object.assign(document.createElement("meta"), { name: "description" }), "content", page.description);
    setHead('link[rel="canonical"]', () => Object.assign(document.createElement("link"), { rel: "canonical" }), "href", `${ORIGIN}${page.path}`);
  }, [path]);
}
