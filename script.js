const passwordOutput = document.querySelector('#password');
const lengthInput = document.querySelector('#length');
const lengthNumber = document.querySelector('#length-number');
const lengthValue = document.querySelector('#length-value');
const historyList = document.querySelector('#history');
const eventsList = document.querySelector('#events');
const copyButton = document.querySelector('#copy');
const toast = document.querySelector('#toast');

let level = 'easy';
let latestPassword = '';
let toastTimer;
const passwords = [];
const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const symbols = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';

function logEvent(message) {
  const item = document.createElement('li');
  item.className = 'event-item';
  const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  item.innerHTML = '<span class="event-time">' + time + '</span><i class="event-marker"></i><span></span>';
  item.lastElementChild.textContent = message;
  eventsList.prepend(item);
  while (eventsList.children.length > 5) eventsList.lastElementChild.remove();
}

function syncLength() {
  const len = Number(lengthInput.value);
  lengthNumber.textContent = len;
  lengthValue.textContent = len + ' ' + (len === 1 ? 'знак' : len > 1 && len < 5 ? 'знака' : 'знаков');
  lengthInput.style.setProperty('--range', (((len - 4) / 36) * 100) + '%');
}

function randomIndex(max) {
  const bytes = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do crypto.getRandomValues(bytes); while (bytes[0] >= limit);
  return bytes[0] % max;
}

function generate() {
  const chars = level === 'easy' ? alphabet : symbols;
  const length = Number(lengthInput.value);
  let result = '';
  for (let i = 0; i < length; i++) result += chars[randomIndex(chars.length)];
  latestPassword = result;
  passwordOutput.textContent = result;
  copyButton.disabled = false;
  const percent = level === 'easy' ? Math.min(100, 20 + length * 2) : Math.min(100, 35 + length * 2.5);
  document.querySelector('#strength-fill').style.width = percent + '%';
  document.querySelector('#strength').textContent = level === 'easy' ? 'ПРОСТОЙ ПАРОЛЬ' : length >= 12 ? 'ВЫСОКАЯ ЗАЩИТА' : 'СЛОЖНЫЙ ПАРОЛЬ';
  passwords.unshift({ value: result, level: level === 'easy' ? 'Простой' : 'Сложный', length });
  renderHistory();
  logEvent('Создан новый пароль');
}

function renderHistory() {
  historyList.replaceChildren();
  if (!passwords.length) {
    const empty = document.createElement('li');
    empty.className = 'empty-state';
    empty.textContent = 'Здесь появятся ваши пароли';
    historyList.append(empty);
    return;
  }
  passwords.slice(0, 5).forEach((entry) => {
    const row = document.createElement('li');
    row.className = 'history-item';
    const pass = document.createElement('span');
    pass.className = 'history-pass';
    pass.textContent = entry.value;
    const meta = document.createElement('span');
    meta.className = 'history-meta';
    meta.textContent = entry.level + ' · ' + entry.length;
    row.append(pass, meta);
    historyList.append(row);
  });
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 1900);
}

document.querySelectorAll('.level-option').forEach((button) => {
  button.addEventListener('click', () => {
    level = button.dataset.level;
    document.querySelectorAll('.level-option').forEach((option) => {
      const selected = option === button;
      option.classList.toggle('active', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
    logEvent('Выбран уровень: ' + (level === 'easy' ? 'Простой' : 'Сложный'));
  });
});

lengthInput.addEventListener('input', syncLength);
document.querySelector('#generate').addEventListener('click', generate);
copyButton.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(latestPassword);
    showToast('Пароль скопирован');
    logEvent('Пароль скопирован в буфер обмена');
  } catch {
    showToast('Не удалось скопировать пароль');
  }
});
document.querySelector('#clear-history').addEventListener('click', () => {
  passwords.length = 0;
  renderHistory();
  logEvent('История очищена');
});

syncLength();
logEvent('Генератор готов к работе');
