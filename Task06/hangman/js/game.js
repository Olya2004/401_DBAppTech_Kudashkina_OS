// Логика игры (без UI/БД)
export const HANGMAN_PICS = [
`  +---+
  |   |
      |
      |
      |
      |
======`,
`  +---+
  |   |
  O   |
      |
      |
      |
======`,
`  +---+
  |   |
  O   |
  |   |
      |
      |
======`,
`  +---+
  |   |
  O   |
 /|   |
      |
      |
======`,
`  +---+
  |   |
  O   |
 /|\\  |
      |
      |
======`,
`  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
======`,
`  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
======`
];

export class Hangman {
  constructor(word, maxWrong = 6) {
    this.word = word.toLowerCase();
    this.maxWrong = maxWrong;
    this.guessed = new Set();  // верные буквы
    this.used = new Set();     // все нажатые буквы
    this.wrongCount = 0;
    this.status = 'playing';   // 'playing' | 'won' | 'lost'
  }

  getMasked() {
    return [...this.word].map(ch => (this.guessed.has(ch) ? ch : ' ')).join('');
  }

  guessLetter(ch) {
    if (this.status !== 'playing') return { result: 'ignored' };
    ch = ch.toLowerCase();
    if (this.used.has(ch)) return { result: 'repeat' };
    this.used.add(ch);

    const hit = this.word.includes(ch);
    if (hit) {
      this.guessed.add(ch);
      if (this.isAllRevealed()) {
        this.status = 'won';
      }
      return { result: 'hit' };
    } else {
      this.wrongCount++;
      if (this.wrongCount >= this.maxWrong) {
        this.status = 'lost';
      }
      return { result: 'miss' };
    }
  }

  guessWord(txt) {
    if (this.status !== 'playing') return { result: 'ignored' };
    txt = (txt || '').toLowerCase().trim();
    if (!txt) return { result: 'empty' };
    if (txt === this.word) {
      this.status = 'won';
      [...this.word].forEach(ch => this.guessed.add(ch));
      return { result: 'hit' };
    } else {
      this.wrongCount++;
      if (this.wrongCount >= this.maxWrong) this.status = 'lost';
      return { result: 'miss' };
    }
  }

  isAllRevealed() {
    return [...new Set(this.word.split(''))].every(ch => this.guessed.has(ch));
  }
}