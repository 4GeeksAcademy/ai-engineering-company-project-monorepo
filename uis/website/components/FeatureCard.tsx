type FeatureCardProps = {
  title: string;
  description: string;
  animationDelayMs?: number;
};

export function FeatureCard({
  title,
  description,
  animationDelayMs = 0,
}: FeatureCardProps) {
  return (
    <article
      className="feature-card"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <h3>{title}</h3>
      <p>{description}</p>
    </article>
  );
}
