import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";
import { beep } from "@/lib/download";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function BarcodeScanner({
  open,
  onOpenChange,
  onScan,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (code: string) => boolean;
}) {
  const { t } = useI18n();
  const [code, setCode] = useState("");
  const [cameraError, setCameraError] = useState("");
  const [cameraStarting, setCameraStarting] = useState(false);
  const onScanRef = useRef(onScan);
  const onOpenChangeRef = useRef(onOpenChange);
  const handledRef = useRef(false);
  onScanRef.current = onScan;
  onOpenChangeRef.current = onOpenChange;

  const handleScan = (raw: string) => {
    const value = raw.trim();
    if (!value || handledRef.current) return;
    if (!onScanRef.current(value)) return;
    handledRef.current = true;
    beep();
    setCode("");
    onOpenChangeRef.current(false);
  };

  useEffect(() => {
    if (!open) {
      setCameraStarting(false);
      setCode("");
      return;
    }
    let cancelled = false;
    let starting = false;
    let scanner: Html5Qrcode | null = null;
    handledRef.current = false;
    setCameraError("");
    setCameraStarting(true);
    const showCameraError = (error: unknown) => {
      const message = error instanceof Error ? `${error.name} ${error.message}` : String(error);
      if (/notallowed|permission|denied|security/i.test(message))
        setCameraError(t.scanner.permissionDenied);
      else if (/notfound|no camera|device.*not found/i.test(message))
        setCameraError(t.scanner.noCamera);
      else setCameraError(t.scanner.cameraError);
      setCameraStarting(false);
    };
    const startTimer = setTimeout(() => {
      if (cancelled) return;
      try {
        scanner = new Html5Qrcode("nova-barcode-reader", { verbose: false });
        starting = true;
        const activeScanner = scanner;
        void activeScanner
          .start(
            { facingMode: { ideal: "environment" } },
            { fps: 10, qrbox: { width: 250, height: 150 }, aspectRatio: 16 / 9 },
            (decodedText) => {
              if (!cancelled) handleScan(decodedText);
            },
            () => {},
          )
          .then(() => {
            starting = false;
            if (cancelled && activeScanner.isScanning) {
              void activeScanner
                .stop()
                .then(() => activeScanner.clear())
                .catch((error: unknown) => console.error("Unable to stop barcode camera", error));
            }
            if (!cancelled) setCameraStarting(false);
          })
          .catch((error: unknown) => {
            starting = false;
            if (!cancelled) showCameraError(error);
            else activeScanner.clear();
          });
      } catch (error) {
        showCameraError(error);
      }
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (!scanner || starting) return;
      if (scanner.isScanning) {
        void scanner
          .stop()
          .then(() => scanner?.clear())
          .catch((error: unknown) => console.error("Unable to stop barcode camera", error));
      } else {
        scanner.clear();
      }
    };
  }, [open, t.scanner.cameraError, t.scanner.noCamera, t.scanner.permissionDenied]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.scanner.title}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-video overflow-hidden rounded-md bg-scanner-bg">
          <div
            id="nova-barcode-reader"
            className="absolute inset-0 [&_video]:h-full [&_video]:w-full [&_video]:object-cover"
          />
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <div className="relative h-32 w-56 rounded-lg border-2 border-dashed border-primary-foreground/80">
              <div className="absolute inset-x-2 top-1/2 h-0.5 animate-scan bg-scanner-line shadow-[0_0_12px_var(--scanner-line)]" />
            </div>
          </div>
          <span className="absolute inset-x-2 bottom-2 z-10 text-center text-xs text-primary-foreground/90">
            {t.scanner.hint}
          </span>
        </div>
        {cameraStarting && (
          <p role="status" className="text-sm text-muted-foreground">
            {t.scanner.cameraStarting}
          </p>
        )}
        {cameraError && (
          <p role="alert" className="rounded-md bg-danger-soft p-2 text-sm text-danger">
            {cameraError}
          </p>
        )}
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            handleScan(code);
          }}
        >
          <Input
            className="font-mono"
            placeholder={t.scanner.manual}
            value={code}
            onChange={(event) => setCode(event.target.value)}
          />
          <Button type="submit" variant="outline" disabled={!code.trim()}>
            {t.common.add}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
