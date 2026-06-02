// TruthCheck background service worker (MV3).
// Owns the context menu and the x402 pay→fetch call to the backend.

const DEFAULTS = {
  // Set your deployed API URL here or via the extension popup (Settings).
  apiUrl: 'https://r79aultgaj.execute-api.eu-central-1.amazonaws.com/prod',
  // Stub payment sentinel; replaced by a signed x402 payload once a dev wallet
  // is provisioned. The backend accepts this off-chain in testnet/stub mode.
  devPayment: 'stub-demo-payment',
};

async function settings() {
  const s = await chrome.storage.sync.get(DEFAULTS);
  return { ...DEFAULTS, ...s };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'truthcheck',
    title: 'Fact-Check "%s" ($0.01)',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'truthcheck' || !info.selectionText || !tab?.id) return;
  await runCheck(tab.id, info.selectionText);
});

// Also allow the content script to trigger a check (floating button).
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === 'truthcheck:run' && sender.tab?.id) {
    runCheck(sender.tab.id, msg.claim);
  }
  return false;
});

async function runCheck(tabId, claim) {
  send(tabId, { type: 'truthcheck:loading', claim });
  try {
    const result = await payAndFetch(claim);
    send(tabId, { type: 'truthcheck:result', result });
  } catch (e) {
    send(tabId, { type: 'truthcheck:error', error: e.message });
  }
}

function send(tabId, payload) {
  chrome.tabs.sendMessage(tabId, payload).catch(() => {});
}

async function payAndFetch(claim) {
  const { apiUrl, devPayment } = await settings();
  const base = apiUrl.replace(/\/$/, '');

  const first = await fetch(`${base}/factcheck`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ claim }),
  });
  if (first.status !== 402) return first.json();

  await first.json(); // consume challenge
  const paid = await fetch(`${base}/factcheck`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-PAYMENT': devPayment },
    body: JSON.stringify({ claim }),
  });
  if (!paid.ok) {
    const e = await paid.json().catch(() => ({}));
    throw new Error(e.error || `Request failed (${paid.status})`);
  }
  return paid.json();
}
