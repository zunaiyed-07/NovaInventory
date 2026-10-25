import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BarcodeScanner } from "@/components/nova/BarcodeScanner";
import { I18nProvider } from "@/lib/i18n";

vi.mock("html5-qrcode", () => ({
  Html5Qrcode: vi.fn(),
}));

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
});
