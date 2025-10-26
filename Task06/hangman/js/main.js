import { initDB, getRandomWord, createGame, addAttempt, finishGame, getAllGames, getGameWithAttempts } from './db.js';
import { Hangman, HANGMAN_PICS } from './game.js';

const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};

const RUS_ALPHABET = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ".split('');
let game = null;
let gameId = null;
let attemptNo = 0;

let replayTimer = null;
let replayState = null;

async function setup() {
  await initDB();
  bindTabs();
  bindNewGame();
  bindReplayControls();
  showScreen('new');
}

function bindTabs() {
  $('#tab-new').addEventListener('click', () => showScreen('new'));
  $('#tab-list').addEventListener('click', async () => {
    await renderGamesList();
    showScreen('list');
  });
}

function showScreen(name) {
  $('#screen-new').classList.toggle('hidden', name !== 'new');
  $('#screen-list').classList.toggle('hidden', name !== 'list');
}

function bindNewGame() {
  $('#btn-start').addEventListener('click', startGame);
  $('#btn-guess-word').addEventListener('click', onGuessWord);
  $('#btn-restart').addEventListener('click', () => {
    $('#player-name').focus();
    resetUI();
  });
}

async function startGame() {
  resetUI();
  const player = ($('#player-name').value || 'Гость').trim();
  const word = await getRandomWord();
  game = new Hangman(word, 6);
  const dateISO = new Date().toISOString();
  gameId = await createGame({ dateISO, player, word, maxWrong: game.maxWrong });
  attemptNo = 0;

  $('#max-wrong').textContent = String(game.maxWrong);
  $('#wrong-count').textContent = '0';
  $('#hangman').textContent = HANGMAN_PICS[0];
  $('#game-area').classList.remove('hidden');
  $('#status').textContent = '';
  $('#status').className = '';
  $('#full-guess').value = '';

  renderWordCells(word.length);
  renderAlphabet();

  // лог пуст
  $('#attempts-log').innerHTML = '';
}

function renderWordCells(n) {
  const wrap = $('#word-cells');
  wrap.innerHTML = '';
  for (let i = 0; i < n; i++) wrap.appendChild(el('div', 'cell', ''));
  updateWordCells();
}

function updateWordCells() {
  const masked = game.getMasked(); // '  а  о  '
  const chars = [...masked.padEnd(game.word.length, ' ')];
  const cells = $('#word-cells').children;
  for (let i = 0; i < cells.length; i++) {
    cells[i].textContent = chars[i] ? chars[i].toUpperCase() : '';
  }
}

function renderAlphabet() {
  const wrap = $('#alphabet');
  wrap.innerHTML = '';
  RUS_ALPHABET.forEach(ch => {
    const b = el('button', 'alpha-btn', ch);
    b.addEventListener('click', () => onLetter(ch));
    wrap.appendChild(b);
  });
}

async function onLetter(ch) {
  if (!game || game.status !== 'playing') return;
  const res = game.guessLetter(ch);
  if (res.result === 'repeat' || res.result === 'ignored') return;

  attemptNo++;
  await addAttempt({
    gameId,
    number: attemptNo,
    guess: ch,
    type: 'letter',
    result: res.result
  });

  // UI обновления
  disableLetter(ch);
  if (res.result === 'hit') {
    updateWordCells();
    addAttemptLog(attemptNo, ch, 'верно');
  } else if (res.result === 'miss') {
    $('#wrong-count').textContent = String(game.wrongCount);
    $('#hangman').textContent = HANGMAN_PICS[Math.min(game.wrongCount, HANGMAN_PICS.length - 1)];
    addAttemptLog(attemptNo, ch, 'ошибка');
  }

  if (game.status === 'won') {
    await finishGame({ gameId, outcome: 'win' });
    onGameEnd(true);
  } else if (game.status === 'lost') {
    await finishGame({ gameId, outcome: 'lose' });
    onGameEnd(false);
  }
}

function disableLetter(ch) {
  [...$('#alphabet').children].forEach(b => {
    if (b.textContent.toLowerCase() === ch.toLowerCase()) b.disabled = true;
  });
}

function addAttemptLog(no, guess, res) {
  const li = el('li', null, `${no} | ${guess.toUpperCase()} | ${res}`);
  $('#attempts-log').appendChild(li);
}

async function onGuessWord() {
  if (!game || game.status !== 'playing') return;
  const text = $('#full-guess').value.trim();
  if (!text) return;
  const res = game.guessWord(text);

  attemptNo++;
  await addAttempt({
    gameId,
    number: attemptNo,
    guess: text,
    type: 'word',
    result: res.result
  });

  if (res.result === 'hit') {
    updateWordCells();
    addAttemptLog(attemptNo, text, 'слово: верно');
    await finishGame({ gameId, outcome: 'win' });
    onGameEnd(true);
  } else if (res.result === 'miss') {
    $('#wrong-count').textContent = String(game.wrongCount);
    $('#hangman').textContent = HANGMAN_PICS[Math.min(game.wrongCount, HANGMAN_PICS.length - 1)];
    addAttemptLog(attemptNo, text, 'слово: ошибка');
    if (game.status === 'lost') {
      await finishGame({ gameId, outcome: 'lose' });
      onGameEnd(false);
    }
  }
}

function onGameEnd(win) {
  // отключить алфавит
  [...$('#alphabet').children].forEach(b => b.disabled = true);
  $('#status').className = win ? 'win' : 'lose';
  $('#status').textContent = win ? 'Победа! Вы угадали слово.' : `Поражение. Было загаданο: ${game.word.toUpperCase()}`;
  $('#btn-restart').classList.remove('hidden');
}

function resetUI() {
  $('#game-area').classList.add('hidden');
  $('#attempts-log').innerHTML = '';
  $('#status').textContent = '';
  $('#status').className = '';
  $('#btn-restart').classList.add('hidden');
  $('#hangman').textContent = HANGMAN_PICS[0];
  $('#wrong-count').textContent = '0';
}

async function renderGamesList() {
  const container = $('#games-list');
  container.innerHTML = '';
  const games = await getAllGames();
  if (!games.length) {
    container.textContent = 'Нет сохранённых партий';
    return;
  }
  const table = el('table');
  const thead = el('thead');
  const trh = el('tr');
  ['Дата', 'Игрок', 'Слово', 'Исход', 'Попыток', 'Действия'].forEach(h => trh.appendChild(el('th', null, h)));
  thead.appendChild(trh); table.appendChild(thead);

  const tbody = el('tbody');
  games.forEach(g => {
    const tr = el('tr');
    const outcome = g.outcome === 'win' ? 'угадал' : (g.outcome === 'lose' ? 'не угадал' : '—');
    const date = new Date(g.date).toLocaleString();
    tr.appendChild(el('td', null, date));
    tr.appendChild(el('td', null, g.player || '—'));
    tr.appendChild(el('td', null, (g.word || '').toUpperCase()));
    tr.appendChild(el('td', null, outcome));
    tr.appendChild(el('td', null, String(g.attemptsCount || 0)));
    const tdBtn = el('td');
    const btn = el('button', 'btn', 'Повтор');
    btn.addEventListener('click', () => openReplay(g.id));
    tdBtn.appendChild(btn);
    tr.appendChild(tdBtn);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

/* Повтор партии */
function bindReplayControls() {
  $('#btn-replay-close').addEventListener('click', closeReplay);
  $('#btn-replay-play').addEventListener('click', replayPlay);
  $('#btn-replay-pause').addEventListener('click', replayPause);
  $('#btn-replay-step').addEventListener('click', replayStep);
}

async function openReplay(id) {
  const { game, attempts } = await getGameWithAttempts(id);
  replayState = {
    word: game.word,
    maxWrong: game.maxWrong,
    wrong: 0,
    step: 0,
    attempts,
    revealed: new Set()
  };
  $('#replay-word').innerHTML = '';
  for (let i = 0; i < game.word.length; i++) {
    $('#replay-word').appendChild(el('div', 'cell', ''));
  }
  $('#replay-hangman').textContent = HANGMAN_PICS[0];
  $('#replay-log').innerHTML = '';
  $('#replay-step').textContent = '0';

  $('#replay-modal').classList.remove('hidden');
}

function closeReplay() {
  replayPause();
  $('#replay-modal').classList.add('hidden');
  replayState = null;
}

function replayPlay() {
  if (!replayState) return;
  if (replayTimer) return;
  replayTimer = setInterval(() => {
    const done = replayStep();
    if (done) replayPause();
  }, 800);
}

function replayPause() {
  if (replayTimer) {
    clearInterval(replayTimer);
    replayTimer = null;
  }
}

function replayStep() {
  if (!replayState) return true;
  const { attempts, step } = replayState;
  if (step >= attempts.length) return true;

  const a = attempts[step];
  applyReplayAttempt(a);
  replayState.step++;
  $('#replay-step').textContent = String(replayState.step);
  return replayState.step >= attempts.length;
}

function applyReplayAttempt(a) {
  const li = el('li', null, `${a.number} | ${a.guess.toUpperCase()} | ${a.type === 'word' ? 'слово: ' : ''}${a.result === 'hit' ? 'верно' : 'ошибка'}`);
  $('#replay-log').appendChild(li);

  if (a.type === 'letter' && a.result === 'hit') {
    // открыть буквы
    [...replayState.word].forEach((ch, i) => {
      if (ch.toLowerCase() === a.guess.toLowerCase()) {
        const cell = $('#replay-word').children[i];
        cell.textContent = ch.toUpperCase();
      }
    });
  } else if (a.result === 'miss') {
    replayState.wrong++;
    $('#replay-hangman').textContent = HANGMAN_PICS[Math.min(replayState.wrong, HANGMAN_PICS.length - 1)];
  }

  if (a.type === 'word' && a.result === 'hit') {
    // открыть всё слово
    [...replayState.word].forEach((ch, i) => {
      const cell = $('#replay-word').children[i];
      cell.textContent = ch.toUpperCase();
    });
  }
}

document.addEventListener('DOMContentLoaded', setup);