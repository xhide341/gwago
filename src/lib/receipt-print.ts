export type ReceiptLineItem = {
  name: string;
  variant: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  adjustedPrice?: number | null;
  subtotal: number;
};

export type ReceiptData = {
  orderId: string;
  createdAt: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  notes?: string;
  salesChannel: string;
  paymentMethod?: string;
  paymentReference?: string;
  subtotal: number;
  channelFee: number;
  netTotal: number;
  items: ReceiptLineItem[];
};

const PRINT_DEDUPE_WINDOW_MS = 3000;
let lastPrintSignature = "";
let lastPrintAt = 0;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatMoney(value: number) {
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildReceiptHtml(data: ReceiptData) {
  const itemRows = data.items
    .map((item) => {
      const priceUsed = item.adjustedPrice ?? item.unitPrice;
      const skuLine = item.sku
        ? `<div class="muted">SKU: ${escapeHtml(item.sku)}</div>`
        : "";
      return `
      <div class="item">
        <div class="line strong">${escapeHtml(item.name)}</div>
        <div class="line muted">${escapeHtml(item.variant)}</div>
        ${skuLine}
        <div class="line split">
          <span>${item.quantity} x PHP ${formatMoney(priceUsed)}</span>
          <span>PHP ${formatMoney(item.subtotal)}</span>
        </div>
      </div>
    `;
    })
    .join("");

  const paymentLine = data.paymentMethod
    ? `<div class="line split"><span>Payment</span><span>${escapeHtml(data.paymentMethod)}</span></div>`
    : "";

  const referenceLine = data.paymentReference
    ? `<div class="line split"><span>Reference</span><span>${escapeHtml(data.paymentReference)}</span></div>`
    : "";

  const noteBlock = data.notes
    ? `<div class="notes"><div class="strong">Notes</div><div>${escapeHtml(data.notes)}</div></div>`
    : "";

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Receipt ${escapeHtml(data.orderId)}</title>
    <style>
      @page { size: 80mm auto; margin: 6mm; }
      html, body { margin: 0; padding: 0; }
      body {
        font-family: "Courier New", Courier, monospace;
        color: #111;
        background: #ececec;
        font-size: 12px;
        line-height: 1.35;
        min-height: 100vh;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        padding: 24px;
        box-sizing: border-box;
      }
      .receipt {
        width: min(96vw, 720px);
        background: #fff;
        border: 1px solid #d1d1d1;
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.14);
        padding: 12px;
        box-sizing: border-box;
      }
      .center { text-align: center; }
      .strong { font-weight: 700; }
      .muted { color: #444; }
      .line { margin: 2px 0; }
      .split { display: flex; justify-content: space-between; gap: 8px; }
      .section { margin-top: 8px; }
      .divider { border-top: 1px dashed #111; margin: 8px 0; }
      .item { margin: 6px 0; }
      .totals .line { margin: 3px 0; }
      .grand { font-size: 13px; }
      .badge { border: 1px solid #111; padding: 1px 4px; display: inline-block; }
      .notes { margin-top: 8px; border-top: 1px dashed #111; padding-top: 6px; }

      @media print {
        body {
          background: #fff;
          display: block;
          min-height: auto;
          padding: 0;
        }
        .receipt {
          width: 72mm;
          border: none;
          box-shadow: none;
          padding: 0;
          margin: 0 auto;
        }
      }
    </style>
  </head>
  <body>
    <main class="receipt">
      <div class="center">
        <div class="strong">GWAGO PRINTING SERVICES</div>
        <div class="muted">Order Receipt</div>
        <div class="line"><span class="badge">${escapeHtml(data.status)}</span></div>
      </div>

      <div class="divider"></div>

      <div class="section">
        <div class="line split"><span>Order</span><span>${escapeHtml(data.orderId)}</span></div>
        <div class="line split"><span>Date</span><span>${escapeHtml(new Date(data.createdAt).toLocaleString("en-PH"))}</span></div>
        <div class="line split"><span>Customer</span><span>${escapeHtml(data.customerName)}</span></div>
        ${data.customerPhone ? `<div class="line split"><span>Phone</span><span>${escapeHtml(data.customerPhone)}</span></div>` : ""}
        ${data.customerEmail ? `<div class="line split"><span>Email</span><span>${escapeHtml(data.customerEmail)}</span></div>` : ""}
        <div class="line split"><span>Channel</span><span>${escapeHtml(data.salesChannel)}</span></div>
        ${paymentLine}
        ${referenceLine}
      </div>

      <div class="divider"></div>

      <div class="section">
        ${itemRows}
      </div>

      <div class="divider"></div>

      <div class="totals">
        <div class="line split"><span>Subtotal</span><span>PHP ${formatMoney(data.subtotal)}</span></div>
        ${data.channelFee > 0 ? `<div class="line split"><span>Deduction</span><span>-PHP ${formatMoney(data.channelFee)}</span></div>` : ""}
        <div class="line split strong grand"><span>Net Total</span><span>PHP ${formatMoney(data.netTotal)}</span></div>
      </div>

      ${noteBlock}

      <div class="divider"></div>
      <div class="center muted">Thank you for your order.</div>
    </main>
  </body>
</html>
`;
}

function createPrintSignature(data: ReceiptData) {
  return [
    data.orderId,
    data.status,
    String(data.netTotal),
    String(data.items.length),
    data.paymentReference ?? "",
  ].join("|");
}

export function printReceiptBrowser(data: ReceiptData) {
  if (typeof window === "undefined") return false;

  const now = Date.now();
  const signature = createPrintSignature(data);
  if (
    signature === lastPrintSignature &&
    now - lastPrintAt < PRINT_DEDUPE_WINDOW_MS
  ) {
    return false;
  }

  lastPrintSignature = signature;
  lastPrintAt = now;

  const popupWidth = 760;
  const popupHeight = 840;
  const dualScreenLeft = window.screenLeft ?? window.screenX ?? 0;
  const dualScreenTop = window.screenTop ?? window.screenY ?? 0;
  const viewportWidth =
    window.innerWidth || document.documentElement.clientWidth || screen.width;
  const viewportHeight =
    window.innerHeight ||
    document.documentElement.clientHeight ||
    screen.height;
  const left = Math.max(
    0,
    Math.floor(dualScreenLeft + (viewportWidth - popupWidth) / 2),
  );
  const top = Math.max(
    0,
    Math.floor(dualScreenTop + (viewportHeight - popupHeight) / 2),
  );

  const popup = window.open(
    "",
    "_blank",
    `width=${popupWidth},height=${popupHeight},left=${left},top=${top}`,
  );
  if (!popup) {
    window.alert(
      "Unable to open print window. Please allow pop-ups for this site.",
    );
    return false;
  }

  popup.document.open();
  popup.document.write(buildReceiptHtml(data));
  popup.document.close();

  let printed = false;
  const printOnce = () => {
    if (printed) return;
    printed = true;
    popup.focus();
    popup.print();
  };

  popup.addEventListener("load", printOnce, { once: true });
  popup.setTimeout(printOnce, 250);
  popup.onafterprint = () => {
    popup.close();
  };

  return true;
}
