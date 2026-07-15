type SectionTitleProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
};

export function SectionTitle({ eyebrow, title, subtitle }: SectionTitleProps) {
  return (
    <header className="section-title">
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h2>{title}</h2>
      {subtitle ? <p className="subtitle">{subtitle}</p> : null}
    </header>
  );
}
