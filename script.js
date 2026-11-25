import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const passwordOutput = document.querySelector('#password');
const lengthInput = document.querySelector('#length');
const lengthNumber = document.querySelector('#length-number');
const lengthValue = document.querySelector('#length-value');
const historyList = document.querySelector('#history');
const eventsList = document.querySelector('#events');
const copyButton = document.querySelector('#copy');
const toast = document.querySelector('#toast');
const authDialog = document.querySelector('#auth-dialog');
const authMessage = document.querySelector('#auth-message');
const usageStatus = document.querySelector('#usage-status');
const guestCountKey = 'nexus_guest_generations_v1';
const config = window.SUPABASE_CONFIG || {};
const supabase = config.url && config.anonKey ? createClient(config.url, config.anonKey) : null;

let level = 'easy';
let latestPassword = '';
let toastTimer;
let authMode = 'signup';
let currentUser = null;
let isAdmin = false;
const passwords = [];
const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const symbols = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';

function logEvent(message) {
  const item = document.createElement('li');
  item.className = 'event-item';
  const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  item.innerHTML = `<span class="event-time">${time}</span><i class="event-marker"></i><span></span>`;
  item.lastElementChild.textContent = message;
  eventsList.prepend(item);
  while (eventsList.children.length > 5) eventsList.lastElementChild.remove();
}

function syncLength() {
  const len = Number(lengthInput.value);
  lengthNumber.textContent = len;
  const lastTwo = len % 100;
  const last = len % 10;
  const noun = lastTwo >= 11 && lastTwo <= 14 ? 'знаков' : last === 1 ? 'знак' : last >= 2 && last <= 4 ? 'знака' : 'знаков';
  lengthValue.textContent = `${len} ${noun}`;
  lengthInput.style.setProperty('--range', `${((len - 4) / 36) * 100}%`);
}

function randomIndex(max) {
  const bytes = new Uint32Array(1);
  const limit = Math.floor(0x100000000 / max) * max;
  do crypto.getRandomValues(bytes); while (bytes[0] >= limit);
  return bytes[0] % max;
}

function generate() {
  if (!currentUser && getGuestCount() >= 3) {
    authDialog.showModal();
    setAuthMessage('Пробные генерации закончились. Войдите или зарегистрируйтесь.');
    return;
  }
  const chars = level === 'easy' ? alphabet : symbols;
  const length = Number(lengthInput.value);
  let result = '';
  for (let i = 0; i < length; i++) result += chars[randomIndex(chars.length)];
  latestPassword = result;
  passwordOutput.textContent = result;
  copyButton.disabled = false;
  const percent = level === 'easy' ? Math.min(100, 20 + length * 2) : Math.min(100, 35 + length * 2.5);
  document.querySelector('#strength-fill').style.width = `${percent}%`;
  document.querySelector('#strength').textContent = level === 'easy' ? 'ПРОСТОЙ ПАРОЛЬ' : length >= 12 ? 'ВЫСОКАЯ ЗАЩИТА' : 'СЛОЖНЫЙ ПАРОЛЬ';
  passwords.unshift({ value: result, level: level === 'easy' ? 'Простой' : 'Сложный', length });
  if (!currentUser) localStorage.setItem(guestCountKey, String(getGuestCount() + 1));
  renderHistory();
  updateUsageStatus();
  logEvent('Создан новый пароль');
}

function getGuestCount() {
  const value = Number(localStorage.getItem(guestCountKey) || 0);
  return Number.isInteger(value) ? Math.max(0, Math.min(3, value)) : 0;
}

function updateUsageStatus() {
  const generateButton = document.querySelector('#generate');
  if (currentUser) {
    usageStatus.textContent = 'Вы вошли в аккаунт. Генерации доступны без ограничений.';
    generateButton.disabled = false;
  } else {
    const left = Math.max(0, 3 - getGuestCount());
    usageStatus.textContent = left ? `Без регистрации осталось генераций: ${left} из 3.` : 'Пробные генерации закончились. Войдите или зарегистрируйтесь.';
    generateButton.disabled = left === 0;
  }
}

function setAuthMessage(message, isError = false) {
  authMessage.textContent = message;
  authMessage.classList.toggle('error', isError);
}

function updateAccountUI(user) {
  currentUser = user || null;
  if (!currentUser) isAdmin = false;
  const email = document.querySelector('#account-email');
  email.hidden = !currentUser;
  email.textContent = currentUser?.email || '';
  document.querySelector('#account-open').hidden = Boolean(currentUser);
  document.querySelector('#account-manage').hidden = !currentUser;
  document.querySelector('#sign-out').hidden = !currentUser;
  document.querySelector('#account-actions').hidden = !currentUser;
  document.querySelector('#admin-open').hidden = !currentUser || !isAdmin;
  document.querySelector('#account-message').textContent = currentUser ? `Выполнен вход: ${currentUser.email}` : '';
  document.querySelector('#auth-form').hidden = Boolean(currentUser);
  document.querySelector('.auth-tabs').hidden = Boolean(currentUser);
  document.querySelector('#auth-title').textContent = currentUser ? 'Ваш аккаунт' : authMode === 'signup' ? 'Создать аккаунт' : 'С возвращением';
  updateUsageStatus();
}

async function setCurrentUser(user) {
  currentUser = user || null;
  isAdmin = false;
  updateAccountUI(currentUser);
  if (!currentUser || !supabase) return;
  const { data, error } = await supabase.from('profiles').select('role').eq('id', currentUser.id).maybeSingle();
  if (error) return;
  isAdmin = data?.role === 'admin';
  updateAccountUI(currentUser);
}

function formatAuthError(error) {
  if (/invalid login credentials/i.test(error.message)) return 'Неверный email или пароль.';
  if (/user already registered/i.test(error.message)) return 'Этот email уже зарегистрирован. Попробуйте войти.';
  return error.message || 'Не удалось выполнить запрос. Попробуйте ещё раз.';
}

document.querySelector('#account-open').addEventListener('click', () => {
  setAuthMessage('');
  document.querySelector('#account-actions').hidden = true;
  authDialog.showModal();
});

document.querySelector('#account-manage').addEventListener('click', () => {
  setAuthMessage('');
  document.querySelector('#account-actions').hidden = false;
  authDialog.showModal();
});

document.querySelector('#admin-open').addEventListener('click', async () => {
  const panel = document.querySelector('#admin-panel');
  const message = document.querySelector('#admin-message');
  const list = document.querySelector('#admin-user-list');
  panel.hidden = false;
  message.textContent = 'Загружаем пользователей…';
  list.replaceChildren();
  const { data, error } = await supabase.functions.invoke('admin-users', { body: { action: 'list' } });
  if (error || !data?.users) { message.textContent = error?.message || 'Не удалось загрузить список.'; return; }
  const { data: profiles, error: profilesError } = await supabase.from('profiles').select('id, role').in('id', data.users.map((user) => user.id));
  if (profilesError) { message.textContent = `Не удалось определить права пользователей: ${profilesError.message}`; return; }
  const roles = new Map(profiles.map((profile) => [profile.id, profile.role]));
  message.textContent = `Аккаунтов: ${data.users.length}`;
  data.users.forEach((user) => {
    const role = roles.get(user.id) || 'user';
    const row = document.createElement('li');
    const identity = document.createElement('span');
    identity.textContent = `${user.email} · ${role === 'admin' ? 'администратор' : 'пользователь'}`;
    row.append(identity);
    if (role !== 'admin') {
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'delete-button'; remove.textContent = 'Удалить';
      remove.addEventListener('click', async () => {
        if (!window.confirm(`Удалить аккаунт ${user.email}?`)) return;
        remove.disabled = true;
        const { error: deleteError } = await supabase.functions.invoke('admin-users', { body: { action: 'delete', userId: user.id } });
        if (deleteError) { message.textContent = `Не удалось удалить: ${deleteError.message}`; remove.disabled = false; return; }
        row.remove(); message.textContent = `Аккаунт ${user.email} удалён.`;
      });
      row.append(remove);
    }
    list.append(row);
  });
});

document.querySelectorAll('.auth-tab').forEach((tab) => tab.addEventListener('click', () => {
  authMode = tab.dataset.authMode;
  document.querySelectorAll('.auth-tab').forEach((item) => item.classList.toggle('active', item === tab));
  document.querySelector('#auth-title').textContent = authMode === 'signup' ? 'Создать аккаунт' : 'С возвращением';
  document.querySelector('#auth-password').autocomplete = authMode === 'signup' ? 'new-password' : 'current-password';
  document.querySelector('#auth-submit').textContent = authMode === 'signup' ? 'Создать аккаунт' : 'Войти';
  setAuthMessage('');
}));

document.querySelector('#auth-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!supabase) {
    setAuthMessage('Вход пока не настроен: добавьте URL и публичный ключ Supabase в supabase-config.js.', true);
    return;
  }
  const submit = document.querySelector('#auth-submit');
  submit.disabled = true;
  setAuthMessage(authMode === 'signup' ? 'Создаём аккаунт…' : 'Входим…');
  const email = document.querySelector('#auth-email').value.trim();
  const password = document.querySelector('#auth-password').value;
  try {
    if (authMode === 'signup') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.href } });
      if (error) throw error;
      if (data.session) {
        await setCurrentUser(data.user);
        authDialog.close();
        showToast('Аккаунт создан');
      } else {
        setAuthMessage('Проверьте почту и подтвердите email, затем войдите.');
      }
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await setCurrentUser(data.user);
      authDialog.close();
      showToast('Вы вошли в аккаунт');
    }
  } catch (error) {
    setAuthMessage(formatAuthError(error), true);
  } finally {
    submit.disabled = false;
  }
});

document.querySelector('#sign-out').addEventListener('click', async () => {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) { showToast('Не удалось выйти из аккаунта'); return; }
  await setCurrentUser(null);
  showToast('Вы вышли из аккаунта');
});

document.querySelector('#delete-account').addEventListener('click', async () => {
  if (!supabase || !currentUser) return;
  if (!window.confirm('Удалить аккаунт без возможности восстановления? Все серверные данные аккаунта будут удалены.')) return;
  const button = document.querySelector('#delete-account');
  button.disabled = true;
  try {
    const { error } = await supabase.functions.invoke('delete-account', { body: {} });
    if (error) throw error;
    try { await supabase.auth.signOut({ scope: 'local' }); } catch { /* Account is already deleted on the server. */ }
    localStorage.removeItem(guestCountKey);
    passwords.length = 0;
    latestPassword = '';
    passwordOutput.textContent = 'Нажмите «Создать»';
    copyButton.disabled = true;
    renderHistory();
    await setCurrentUser(null);
    authDialog.close();
    showToast('Аккаунт и данные удалены');
  } catch (error) {
    setAuthMessage(`Не удалось удалить аккаунт: ${formatAuthError(error)}`, true);
  } finally {
    button.disabled = false;
  }
});

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
    meta.textContent = `${entry.level} · ${entry.length}`;
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
    logEvent(`Выбран уровень: ${level === 'easy' ? 'Простой' : 'Сложный'}`);
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
updateAccountUI(null);
logEvent('Генератор готов к работе');

if (!supabase) {
  document.querySelector('#account-open').title = 'Supabase ещё не настроен';
} else {
  supabase.auth.getSession().then(({ data }) => setCurrentUser(data.session?.user || null));
  supabase.auth.onAuthStateChange((event, session) => {
    setTimeout(() => void setCurrentUser(session?.user || null), 0);
    if (event === 'SIGNED_IN' && authDialog.open) authDialog.close();
  });
}
