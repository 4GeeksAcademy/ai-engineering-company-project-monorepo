// Automatic JSX runtime - no explicit React import needed
export default function LoadingFallback({ message = "TrackFlow..." }: { message?: string }) {
  return (
    <main>
      <p role="status">Loading {message}</p>
    </main>
  );
}