const field = document.getElementById("service");
serviceAddress().then((address) => (field.value = address));
document.querySelector("form").addEventListener("submit", async (event) => {
  event.preventDefault();
  await chrome.storage.local.set({ service: field.value.trim() });
  document.getElementById("message").textContent = "Enregistré.";
});
