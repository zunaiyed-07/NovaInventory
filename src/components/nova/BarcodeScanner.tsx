import { useEffect, useRef, useState } from "react";
import { Flashlight, FlashlightOff, ZoomIn } from "lucide-react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { useI18n } from "@/lib/i18n";
import { beep } from "@/lib/download";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function isUnsupportedFacingMode(error: unknown) {
  if (!(error instanceof Error)) return false;
  return (
    error.name === "OverconstrainedError" ||
    /overconstrained|constraint.*facing.?mode|facing.?mode.*constraint/i.test(error.message)
  );
}

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
  const [scanFrame, setScanFrame] = useState({ width: 224, height: 128 });
  const [zoomSupported, setZoomSupported] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [controlsBusy, setControlsBusy] = useState(false);
  const [cameraControlError, setCameraControlError] = useState("");
  const onScanRef = useRef(onScan);
  const onOpenChangeRef = useRef(onOpenChange);
  const handledRef = useRef(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const baseZoomRef = useRef(1);
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
      setZoomSupported(false);
      setTorchSupported(false);
      setZoomed(false);
      setTorchOn(false);
      setControlsBusy(false);
      setCameraControlError("");
      return;
    }
    let cancelled = false;
    let starting = false;
    let scanner: Html5Qrcode | null = null;
    handledRef.current = false;
    setCameraError("");
    setCameraStarting(true);
    setControlsBusy(false);
    const showCameraError = (error: unknown) => {
      const name = error instanceof Error ? error.name : "";
      const message =
        `${name} ${error instanceof Error ? error.message : String(error)}`.toLowerCase();
      if (/notallowed|permission|denied/.test(message)) setCameraError(t.scanner.permissionDenied);
      else if (/notfound|no camera|device.*not found/.test(message))
        setCameraError(t.scanner.noCamera);
      else if (name === "NotReadableError" || /notreadable|trackstart/.test(message))
        setCameraError(t.scanner.cameraInUse);
      else if (/securityerror|secure context|media devices not supported/.test(message))
        setCameraError(t.scanner.secureContext);
      else setCameraError(t.scanner.cameraError);
      setCameraStarting(false);
    };
    if (!window.isSecureContext) {
      setCameraError(t.scanner.secureContext);
      setCameraStarting(false);
      return () => {
        cancelled = true;
      };
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(t.scanner.unsupported);
      setCameraStarting(false);
      return () => {
        cancelled = true;
      };
    }
    const startTimer = setTimeout(() => {
      if (cancelled) return;
      try {
        const formats = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.QR_CODE,
        ];
        scanner = new Html5Qrcode("nova-barcode-reader", {
          verbose: false,
          formatsToSupport: formats,
          useBarCodeDetectorIfSupported: true,
        });
        starting = true;
        const activeScanner = scanner;
        scannerRef.current = activeScanner;
        const scanConfig = {
          fps: 15,
          disableFlip: true,
          qrbox: (width: number, height: number) => {
            const dimensions = {
              width: Math.max(1, Math.min(420, Math.floor(width * 0.85))),
              height: Math.max(1, Math.min(160, Math.floor(height * 0.45))),
            };
            setScanFrame(dimensions);
            return dimensions;
          },
        };
        const onDecoded = (decodedText: string) => {
          if (!cancelled) handleScan(decodedText);
        };
        const updateCameraFeatures = () => {
          try {
            const capabilities = activeScanner.getRunningTrackCameraCapabilities();
            const zoom = capabilities.zoomFeature();
            const supportsTwoTimesZoom = zoom.isSupported() && zoom.max() >= 2;
            setZoomSupported(supportsTwoTimesZoom);
            if (supportsTwoTimesZoom) {
              const currentZoom = zoom.value();
              baseZoomRef.current =
                currentZoom !== null && currentZoom < 2 ? currentZoom : Math.max(zoom.min(), 1);
            }
            setTorchSupported(capabilities.torchFeature().isSupported());
          } catch (error) {
            console.error("Unable to read barcode camera capabilities", error);
            setZoomSupported(false);
            setTorchSupported(false);
          }
        };
        void activeScanner
          .start({ facingMode: "environment" }, scanConfig, onDecoded, () => {})
          .catch(async (error: unknown) => {
            if (cancelled || !isUnsupportedFacingMode(error)) throw error;
            const cameras = await Html5Qrcode.getCameras();
            const fallbackCamera =
              cameras.find(({ label }) => /back|rear|environment/i.test(label)) ?? cameras[0];
            if (!fallbackCamera) throw error;
            return activeScanner.start(fallbackCamera.id, scanConfig, onDecoded, () => {});
          })
          .then(() => {
            starting = false;
            if (!cancelled) updateCameraFeatures();
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
      scannerRef.current = null;
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
  }, [
    open,
    t.scanner.cameraError,
    t.scanner.cameraInUse,
    t.scanner.noCamera,
    t.scanner.permissionDenied,
    t.scanner.secureContext,
    t.scanner.unsupported,
  ]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.scanner.title}</DialogTitle>
        </DialogHeader>
        <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-scanner-bg sm:aspect-video">
          <div
            id="nova-barcode-reader"
            className="h-full w-full [&_video]:h-full [&_video]:w-full [&_video]:object-fill"
          />
          <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
            <div
              className="relative box-border max-w-[85%] rounded-xl border-2 border-dashed border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]"
              style={{
                width: scanFrame.width,
                height: scanFrame.height,
              }}
            >
              <div className="absolute inset-x-2 top-1/2 h-0.5 -translate-y-1/2 animate-scan bg-scanner-line shadow-[0_0_12px_var(--scanner-line)]" />
            </div>
          </div>
          <span className="absolute inset-x-2 bottom-2 z-10 text-center text-xs text-primary-foreground/90">
            {t.scanner.hint}
          </span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Button
            type="button"
            variant={zoomed ? "default" : "outline"}
            size="sm"
            aria-label={zoomed ? t.scanner.zoomReset : t.scanner.zoomIn}
            title={zoomSupported ? t.scanner.zoomIn : t.scanner.zoomUnavailable}
            aria-pressed={zoomed}
            disabled={!zoomSupported || cameraStarting || controlsBusy}
            onClick={async () => {
              const activeScanner = scannerRef.current;
              if (!activeScanner || !zoomSupported || controlsBusy) return;
              setControlsBusy(true);
              setCameraControlError("");
              try {
                await activeScanner
                  .getRunningTrackCameraCapabilities()
                  .zoomFeature()
                  .apply(zoomed ? baseZoomRef.current : 2);
                setZoomed(!zoomed);
              } catch (error) {
                console.error("Unable to change barcode camera zoom", error);
                setCameraControlError(t.scanner.cameraControlError);
              } finally {
                setControlsBusy(false);
              }
            }}
          >
            <ZoomIn className="mr-1 h-4 w-4" aria-hidden="true" />
            {zoomed ? "1×" : "2×"}
          </Button>
          <Button
            type="button"
            variant={torchOn ? "default" : "outline"}
            size="sm"
            aria-label={torchOn ? t.scanner.flashOff : t.scanner.flashOn}
            title={torchSupported ? t.scanner.flashOn : t.scanner.flashUnavailable}
            aria-pressed={torchOn}
            disabled={!torchSupported || cameraStarting || controlsBusy}
            onClick={async () => {
              const activeScanner = scannerRef.current;
              if (!activeScanner || !torchSupported || controlsBusy) return;
              setControlsBusy(true);
              setCameraControlError("");
              try {
                await activeScanner
                  .getRunningTrackCameraCapabilities()
                  .torchFeature()
                  .apply(!torchOn);
                setTorchOn(!torchOn);
              } catch (error) {
                console.error("Unable to change barcode camera flash", error);
                setCameraControlError(t.scanner.cameraControlError);
              } finally {
                setControlsBusy(false);
              }
            }}
          >
            {torchOn ? (
              <FlashlightOff className="mr-1 h-4 w-4" aria-hidden="true" />
            ) : (
              <Flashlight className="mr-1 h-4 w-4" aria-hidden="true" />
            )}
            {torchOn ? t.scanner.flashOff : t.scanner.flashOn}
          </Button>
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
        {cameraControlError && (
          <p role="alert" className="rounded-md bg-danger-soft p-2 text-sm text-danger">
            {cameraControlError}
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
