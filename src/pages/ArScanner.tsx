export default function ArScanner() {
  return (
    <iframe
      src="/ar-scanner.html"
      title="AR Scanner"
      className="w-full border-0"
      style={{ height: "100dvh" }}
      allow="camera; microphone; accelerometer; gyroscope; xr-spatial-tracking"
    />
  );
}
