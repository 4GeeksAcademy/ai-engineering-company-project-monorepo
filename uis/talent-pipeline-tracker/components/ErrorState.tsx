import Alert from "@/components/Alert";

export default function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <Alert
      variant="error"
      title="No se pudieron cargar los datos"
      message={message}
      onRetry={onRetry}
    />
  );
}
