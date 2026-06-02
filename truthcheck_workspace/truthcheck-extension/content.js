// TruthCheck content script: shows a floating "Fact-Check" button near a
// selection, and renders the result in an inline card.

let btn, card, lastClaim = '';

document.addEventListener('mouseup', () => {
  const sel = window.getSelection();
  const text = sel ? sel.toString().trim() : '';
  if (text.length < 8) { hideButton(); return; }
  const range = sel.getRangeAt(0).getBoundingClientRect();
  showButton(range, text);
});

document.addEventListener('mousedown', (e) => {
  if (btn && e.target !== btn) hideButton();
  if (card && !card.contains(e.target)) hideCard();
});

function showButton(rect, text) {
  lastClaim = text;
  if (!btn) {
    btn = document.createElement('button');
    btn.className = 'tc-fab';
    btn.textContent = '✓ Fact-Check $0.01';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'truthcheck:run', claim: lastClaim });
      hideButton();
    });
    document.body.appendChild(btn);
  }
  btn.style.top = `${window.scrollY + rect.bottom + 8}px`;
  btn.style.left = `${window.scrollX + rect.left}px`;
  btn.style.display = 'block';
}
function hideButton() { if (btn) btn.style.display = 'none'; }

function ensureCard() {
  if (card) return card;
  card = document.createElement('div');
  card.className = 'tc-card';
  document.body.appendChild(card);
  return card;
}
function hideCard() { if (card) card.style.display = 'none'; }

function positionCard() {
  card.style.display = 'block';
  card.style.top = `${window.scrollY + 80}px`;
}

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'truthcheck:loading') {
    const c = ensureCard();
    c.innerHTML = `<div class="tc-head">TruthCheck<span class="tc-x">×</span></div>
      <div class="tc-body"><div class="tc-spin"></div> Verifying claim & settling payment…</div>`;
    wireClose(c); positionCard();
  } else if (msg.type === 'truthcheck:error') {
    const c = ensureCard();
    c.innerHTML = `<div class="tc-head">TruthCheck<span class="tc-x">×</span></div>
      <div class="tc-body tc-err">${escapeHtml(msg.error)}</div>`;
    wireClose(c); positionCard();
  } else if (msg.type === 'truthcheck:result') {
    renderResult(msg.result);
  }
});

function renderResult(d) {
  const c = ensureCard();
  const rating = (d.truthRating || 'UNVERIFIABLE');
  const conf = d.confidence != null ? `${Math.round(d.confidence * 100)}%` : '';
  const sources = (d.sources || []).map((s) =>
    `<li><a href="${s.url}" target="_blank" rel="noopener">${escapeHtml(s.title || s.url)}</a></li>`
  ).join('');
  c.innerHTML = `
    <div class="tc-head">TruthCheck<span class="tc-x">×</span></div>
    <div class="tc-body">
      <div class="tc-rating tc-${rating}">${rating.replace('_', ' ')}${conf ? ` · ${conf}` : ''}</div>
      <p class="tc-summary">${escapeHtml(d.summary || '')}</p>
      ${sources ? `<ul class="tc-sources">${sources}</ul>` : ''}
      <div class="tc-meta">${d.paid ? '✅ paid' : ''}${d.network ? ' · ' + d.network : ''}${d.txHash ? ' · tx ' + d.txHash.slice(0, 12) + '…' : ''}</div>
    </div>`;
  wireClose(c); positionCard();
}

function wireClose(c) {
  const x = c.querySelector('.tc-x');
  if (x) x.addEventListener('click', hideCard);
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (m) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
}
