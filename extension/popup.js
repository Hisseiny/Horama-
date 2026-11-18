// The window of the button: the address of the open tab, ready to change, and « Envoyer Horama ». The report opens in a tab
// of the extension, which stays open for the whole exploration (a popup closes as soon as it loses the focus).
const field = document.getElementById("adresse");
const message = document.getElementById("message");
const form = document.querySelector("form");
poserMascotte(document.getElementById("mascotte"), "observe");

// activeTab gives the address of the open tab when the button of the extension is clicked; nothing else is read.
chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
  if (tab?.url && /^https?:/.test(tab.url)) field.value = tab.url;
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = form.querySelector("button");
  button.disabled = true;
  message.className = "";
  message.textContent = "Il part…";
  const service = await serviceAddress();
  const { status, body } = await ask(`${service}/explorations`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: field.value }) });
  if (status === 202 && body.id) {
    await chrome.tabs.create({ url: chrome.runtime.getURL(`rapport.html?id=${encodeURIComponent(body.id)}`) });
    window.close();
    return;
  }
  message.className = "erreur";
  message.textContent = body.erreur || `Le service a répondu ${status}.`;
  button.disabled = false;
});
