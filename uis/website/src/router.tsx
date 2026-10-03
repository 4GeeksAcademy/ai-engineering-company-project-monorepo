import { MouseEvent, ReactNode } from "react";

export const TALENT_PATH = "/talento";

export const currentPath = () =>
  window.location.pathname.replace(/\/+$/, "") === TALENT_PATH
    ? TALENT_PATH
    : "/";

export function Link({
  to,
  onNavigate,
  className,
  children,
}: {
  to: string;
  onNavigate: () => void;
  className?: string;
  children: ReactNode;
}) {
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.button !== 0
    )
      return;
    event.preventDefault();
    window.history.pushState(null, "", to);
    onNavigate();
  };
  return (
    <a href={to} onClick={click} className={className}>
      {children}
    </a>
  );
}