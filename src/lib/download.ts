export function downloadFile(name: string, content: string, type = "text/plain") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}

export function printArea(id: string) {
  const receipt = id === "receipt" ? document.getElementById(id) : null;
  const printRoot = receipt?.cloneNode(true);
  if (printRoot instanceof HTMLElement) {
    printRoot.id = "receipt-print-root";
    document.body.append(printRoot);
  }
  const previousBodyHeight = document.body.style.height;
  const previousDocumentHeight = document.documentElement.style.height;
  document.body.dataset.printing = id;
  if (printRoot instanceof HTMLElement) {
    const height = Math.ceil((printRoot.getBoundingClientRect().height * 25.4) / 96) + 4;
    const style = document.createElement("style");
    style.id = "active-print-page-style";
    style.textContent = `@page { size: 80mm ${height}mm; margin: 0; }`;
    document.head.append(style);
    document.documentElement.style.height = `${height}mm`;
    document.body.style.height = `${height}mm`;
  }
  let cleaned = false;
  const done = () => {
    if (cleaned) return;
    cleaned = true;
    delete document.body.dataset.printing;
    document.body.style.height = previousBodyHeight;
    document.documentElement.style.height = previousDocumentHeight;
    document.getElementById("active-print-page-style")?.remove();
    printRoot?.parentNode?.removeChild(printRoot);
    window.removeEventListener("afterprint", done);
  };
  window.addEventListener("afterprint", done);
  setTimeout(() => window.print(), 50);
}

export function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 1760;
    g.gain.value = 0.08;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.12);
  } catch {
    /* audio unavailable */
  }
}
