const isPinterest = (u) => /^https:\/\/([a-z0-9-]+\.)?pinterest\.[a-z.]+\//i.test(u || '');

chrome.action.onClicked.addListener(async (tab) => {
  if (!isPinterest(tab.url)) {
    await chrome.tabs.create({ url: chrome.runtime.getURL('results.html?help=1') });
    return;
  }
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] });
  } catch (e) {
    console.error('Board Saver: could not start on this page', e);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if (!msg || msg.type !== 'pbd-scan') return;
  const id = 'job_' + Date.now();
  chrome.storage.local
    .set({ [id]: msg.job })
    .then(() =>
      chrome.tabs.create({
        url: chrome.runtime.getURL('results.html?job=' + id),
        index: sender.tab ? sender.tab.index + 1 : undefined
      })
    )
    .then(() => reply({ ok: true }))
    .catch((e) => reply({ ok: false, error: String(e) }));
  return true;
});
