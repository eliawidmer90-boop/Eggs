'use strict';

// This recipient is the only destination used by the enquiry form.
const ORDER_EMAIL = 'eliawidmer@hotmail.com';
const form = document.querySelector('#order-form');
const quantity = document.querySelector('#quantity');
const total = document.querySelector('#total');
const minus = document.querySelector('#minus');
const plus = document.querySelector('#plus');
const date = document.querySelector('#date');
const requestDialog = document.querySelector('#request-dialog');
let preparedRequest = '';
let dialogOpener = null;

const today = new Date();
const localDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
date.min = localDay;
document.querySelector('#year').textContent = String(today.getFullYear());

function updateQuantity() {
  const count = Number(quantity.value);
  const pack = Number(new FormData(form).get('pack'));
  const valid = Number.isInteger(count) && count >= 1 && count <= 100;
  total.textContent = valid ? `${pack * count} Eier` : 'Menge prüfen';
  minus.disabled = !valid || count <= 1;
  plus.disabled = !valid || count >= 100;
}

minus.addEventListener('click', () => { quantity.stepDown(); updateQuantity(); });
plus.addEventListener('click', () => { quantity.stepUp(); updateQuantity(); });
form.addEventListener('input', updateQuantity);
form.addEventListener('change', updateQuantity);
quantity.addEventListener('blur', () => {
  if (quantity.value === '') quantity.value = '1';
  updateQuantity();
});
document.querySelectorAll('[data-pack]').forEach(link => {
  link.addEventListener('click', () => {
    form.querySelector(`input[name="pack"][value="${link.dataset.pack}"]`).checked = true;
    updateQuantity();
  });
});
updateQuantity();

const menuToggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#hauptnavigation');
function closeMenu() {
  navigation.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Menü öffnen');
}
menuToggle.addEventListener('click', () => {
  const expanded = menuToggle.getAttribute('aria-expanded') !== 'true';
  menuToggle.setAttribute('aria-expanded', String(expanded));
  menuToggle.setAttribute('aria-label', expanded ? 'Menü schliessen' : 'Menü öffnen');
  navigation.classList.toggle('is-open', expanded);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && navigation.classList.contains('is-open')) {
    closeMenu(); menuToggle.focus();
  }
});

function openDialog(dialog, opener) {
  dialogOpener = opener;
  dialog.showModal();
}
document.querySelectorAll('[data-dialog]').forEach(button => {
  button.addEventListener('click', () => openDialog(document.getElementById(button.dataset.dialog), button));
});
document.querySelectorAll('dialog').forEach(dialog => {
  dialog.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    const rect = dialog.getBoundingClientRect();
    if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close();
  });
  dialog.addEventListener('close', () => { if (dialogOpener) dialogOpener.focus(); });
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  const data = new FormData(form);
  const nameInput = document.querySelector('#name');
  if (!String(data.get('name')).trim()) {
    nameInput.setCustomValidity('Bitte gib deinen Namen ein.');
    nameInput.reportValidity();
    return;
  }
  const count = Number(data.get('quantity'));
  const pack = Number(data.get('pack'));
  if (!Number.isInteger(count) || count < 1 || count > 100 || ![6, 10, 30].includes(pack)) return;
  const desired = String(data.get('date'));
  const desiredFormatted = desired ? `${desired.slice(8, 10)}.${desired.slice(5, 7)}.${desired.slice(0, 4)}` : 'Nach Absprache';
  preparedRequest = [
    'Grüezi!', '',
    'Ich möchte folgende Walliser Premiumeier unverbindlich anfragen:', '',
    `Wunschmenge: ${count} × ${pack} Eier = ${count * pack} Eier`,
    `Übergabe: ${data.get('handover')}`,
    `Wunschtermin: ${desiredFormatted}`, '',
    `Name: ${String(data.get('name')).trim()}`,
    `E-Mail: ${String(data.get('email')).trim()}`,
    `Telefon: ${String(data.get('phone')).trim() || 'Nicht angegeben'}`, '',
    `Nachricht: ${String(data.get('message')).trim() || 'Keine weiteren Wünsche.'}`, '',
    'Bitte bestätigt mir Preis, Verfügbarkeit und Übergabe persönlich.',
    'Ich bin mit der Verwendung meiner Angaben zur Bearbeitung dieser Anfrage einverstanden.', '',
    'Vielen Dank und freundliche Grüsse',
    String(data.get('name')).trim()
  ].join('\n');
  const subject = `Bestellanfrage: ${count * pack} Walliser Premiumeier`;
  document.querySelector('#request-preview').textContent = preparedRequest;
  document.querySelector('#send-email').href = `mailto:${ORDER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(preparedRequest)}`;
  document.querySelector('#copy-status').textContent = '';
  openDialog(requestDialog, event.submitter || form.querySelector('[type="submit"]'));
});
document.querySelector('#name').addEventListener('input', event => event.target.setCustomValidity(''));

document.querySelector('#copy-request').addEventListener('click', async () => {
  const status = document.querySelector('#copy-status');
  try {
    await navigator.clipboard.writeText(`An: ${ORDER_EMAIL}\n\n${preparedRequest}`);
    status.textContent = 'Kopiert. Du kannst die Anfrage jetzt in dein Webmail einfügen.';
  } catch {
    status.textContent = 'Bitte markiere und kopiere den Text oben oder lade ihn herunter.';
  }
});
document.querySelector('#download-request').addEventListener('click', () => {
  const blob = new Blob([`An: ${ORDER_EMAIL}\r\nBetreff: Bestellanfrage Walliser Premiumeier\r\n\r\n${preparedRequest.replace(/\n/g, '\r\n')}`], {type:'text/plain;charset=utf-8'});
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Bestellanfrage-Walliser-Premiumeier.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  document.querySelector('#copy-status').textContent = 'Download vorbereitet. Sende die Anfrage anschliessend per E-Mail.';
});
