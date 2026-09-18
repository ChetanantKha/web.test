export default function ErrorAlert({ message }: { message: string }) {
  return (
    <div className="animate-alert-in flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      <span aria-hidden className="mt-0.5">
        ⚠️
      </span>
      <span>{message}</span>
    </div>
  );
}
