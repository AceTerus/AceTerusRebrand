import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ScanLine, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

const OMR_API_URL = "http://localhost:8000";

export default function OmrScanner() {
  const navigate = useNavigate();
  const [iframeError, setIframeError] = useState(false);
  const [key, setKey] = useState(0); // force iframe reload

  const handleIframeLoad = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    try {
      // If the iframe loaded but the API is down, the src will be about:blank or similar
      const iframe = e.currentTarget;
      if (iframe.contentDocument?.title === "404") setIframeError(true);
    } catch {
      // cross-origin access blocked = loaded fine
    }
    setIframeError(false);
  };

  const handleIframeError = () => setIframeError(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/quiz")}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to Quiz
        </Button>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <ScanLine className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-sm leading-none">OMR Scanner</h1>
            <p className="text-[11px] text-muted-foreground mt-0.5">Optical Mark Recognition</p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setIframeError(false); setKey(k => k + 1); }}
            className="gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reload
          </Button>
          <a
            href={OMR_API_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="sm">Open in tab ↗</Button>
          </a>
        </div>
      </div>

      {/* Error banner */}
      {iframeError && (
        <div className="px-4 pt-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Could not reach the OMR API at <code>localhost:8000</code>. Make sure the server is running:
              <br />
              <code className="text-xs mt-1 block">
                cd omr-scanner &amp;&amp; uvicorn main:socket_app --port 8000
              </code>
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* iframe */}
      <div className="flex-1 p-4">
        <iframe
          key={key}
          src={OMR_API_URL}
          title="OMR Scanner"
          className="w-full rounded-xl border border-border shadow-sm bg-background"
          style={{ height: "calc(100vh - 120px)", minHeight: 600 }}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          allow="camera"
        />
      </div>
    </div>
  );
}
