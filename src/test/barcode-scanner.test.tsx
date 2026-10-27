import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BarcodeScanner } from "@/components/nova/BarcodeScanner";
import { I18nProvider } from "@/lib/i18n";

const scannerMocks = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  getCameras: vi.fn(),
  zoomApply: vi.fn(),
  torchApply: vi.fn(),
}));

vi.mock("html5-qrcode", () => ({
  Html5QrcodeSupportedFormats: {
    EAN_13: 9,
    EAN_8: 10,
    UPC_A: 14,
    UPC_E: 15,
    CODE_128: 5,
    CODE_39: 3,
    CODE_93: 4,
    ITF: 8,
    CODABAR: 2,
    QR_CODE: 0,
  },
  Html5Qrcode: Object.assign(
    vi.fn().mockImplementation(function () {
      return {
        start: scannerMocks.start,
        stop: scannerMocks.stop,
        clear: scannerMocks.clear,
        isScanning: false,
        getRunningTrackCameraCapabilities: () => ({
          zoomFeature: () => ({
            isSupported: () => true,
            min: () => 1,
            max: () => 3,
            value: () => 1,
            apply: scannerMocks.zoomApply,
          }),
          torchFeature: () => ({
            isSupported: () => true,
            value: () => false,
            apply: scannerMocks.torchApply,
          }),
        }),
      };
    }),
    { getCameras: scannerMocks.getCameras },
  ),
}));

beforeEach(() => {
  scannerMocks.start.mockReset().mockResolvedValue(null);
  scannerMocks.stop.mockReset().mockResolvedValue(undefined);
  scannerMocks.clear.mockReset();
  scannerMocks.getCameras.mockReset().mockResolvedValue([]);
  scannerMocks.zoomApply.mockReset().mockResolvedValue(undefined);
  scannerMocks.torchApply.mockReset().mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
});

function renderScanner() {
  return render(
    <I18nProvider>
      <BarcodeScanner open onOpenChange={vi.fn()} onScan={vi.fn(() => true)} />
    </I18nProvider>,
  );
}

describe("barcode scanner camera requirements", () => {
  it("explains that an HTTP LAN address cannot access the camera", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: false });
    renderScanner();

    expect(await screen.findByRole("alert")).toHaveTextContent(/secure HTTPS address/);
  });

  it("explains when the browser does not expose camera access", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: undefined });
    renderScanner();

    expect(await screen.findByRole("alert")).toHaveTextContent(/does not support camera access/);
  });

  it("starts with a facing-mode constraint supported by html5-qrcode", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    renderScanner();

    await waitFor(() =>
      expect(scannerMocks.start).toHaveBeenCalledWith(
        { facingMode: "environment" },
        expect.objectContaining({ fps: 15, disableFlip: true }),
        expect.any(Function),
        expect.any(Function),
      ),
    );
    const scanConfig = scannerMocks.start.mock.calls[0][1] as {
      qrbox: (width: number, height: number) => { width: number; height: number };
    };
    act(() => {
      expect(scanConfig.qrbox(360, 240)).toEqual({ width: 306, height: 108 });
    });
  });

  it("uses the camera's 2x zoom and restores the original zoom", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    renderScanner();
    const zoomButton = await screen.findByRole("button", { name: "Zoom to 2×" });
    await waitFor(() => expect(zoomButton).toBeEnabled());

    await act(async () => {
      zoomButton.click();
    });
    expect(scannerMocks.zoomApply).toHaveBeenNthCalledWith(1, 2);

    await act(async () => {
      screen.getByRole("button", { name: "Reset zoom" }).click();
    });
    expect(scannerMocks.zoomApply).toHaveBeenNthCalledWith(2, 1);
  });

  it("toggles the camera torch on and off", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    renderScanner();
    const flashButton = await screen.findByRole("button", { name: "Flash on" });
    await waitFor(() => expect(flashButton).toBeEnabled());

    await act(async () => {
      flashButton.click();
    });
    expect(scannerMocks.torchApply).toHaveBeenNthCalledWith(1, true);

    await act(async () => {
      screen.getByRole("button", { name: "Flash off" }).click();
    });
    expect(scannerMocks.torchApply).toHaveBeenNthCalledWith(2, false);
  });

  it("falls back to an available camera when the rear-facing constraint is unsupported", async () => {
    Object.defineProperty(window, "isSecureContext", { configurable: true, value: true });
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: { getUserMedia: vi.fn() },
    });
    scannerMocks.start
      .mockRejectedValueOnce(
        Object.assign(new Error("facingMode constraint"), {
          name: "OverconstrainedError",
        }),
      )
      .mockResolvedValueOnce(null);
    scannerMocks.getCameras.mockResolvedValue([
      { id: "desktop-camera", label: "Integrated Camera" },
    ]);
    renderScanner();

    await waitFor(() =>
      expect(scannerMocks.start).toHaveBeenNthCalledWith(
        2,
        "desktop-camera",
        expect.objectContaining({ fps: 15, disableFlip: true }),
        expect.any(Function),
        expect.any(Function),
      ),
    );
  });
});
