const DEFAULTS = {
  apiUrl: 'https://r79aultgaj.execute-api.eu-central-1.amazonaws.com/prod',
};

const apiInput = document.getElementById('apiUrl');
const okEl = document.getElementById('ok');

chrome.storage.sync.get(DEFAULTS).then((s) => {
  apiInput.value = s.apiUrl || DEFAULTS.apiUrl;
});

document.getElementById('save').addEventListener('click', async () => {
  await chrome.storage.sync.set({ apiUrl: apiInput.value.trim() });
  okEl.textContent = 'Saved ✓';
  setTimeout(() => (okEl.textContent = ''), 1500);
});
