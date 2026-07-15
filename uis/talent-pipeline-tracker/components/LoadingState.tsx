import Spinner from "@/components/Spinner";

export default function LoadingState({ label }: { label?: string }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
      <Spinner label={label} />
    </div>
  );
}
