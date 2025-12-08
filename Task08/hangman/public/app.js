const app = {
    currentGameId: null,
    targetWord: "",
    currentStep: 0,
    mistakes: 0,
    maxMistakes: 6,
    guessedLetters: new Set(),
    
    hangmanStates: [
        `
  +---+
  |   |
      |
      |
      |
      |
=========`, 
        `
  +---+
  |   |
  O   |
      |
      |
      |
=========`,
        `
  +---+
  |   |
  O   |
  |   |
      |
      |
=========`,
        `
  +---+
  |   |
  O   |
 /|   |
      |
      |
=========`,
        `
  +---+
  |   |
  O   |
 /|\\  |
      |
      |
=========`,
        `
  +---+
  |   |
  O   |
 /|\\  |
 /    |
      |
=========`,
        `
  +---+
  |   |
  O   |
 /|\\  |
 / \\  |
      |
=========
GAME OVER`
    ],


    showScreen(screenName) {
        document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
        document.getElementById(`screen-${screenName}`).classList.remove('hidden');
        
        document.querySelectorAll('nav button').forEach(b => b.classList.remove('active'));
        if(screenName === 'start' || screenName === 'game') document.getElementById('nav-new-game').classList.add('active');
        if(screenName === 'history') document.getElementById('nav-history').classList.add('active');
    },

    // --- API ---

    async apiCall(url, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: { 'Content-Type': 'application/json' }
        };
        if (data) options.body = JSON.stringify(data);
        const res = await fetch(url, options);
        return await res.json();
    },


    async startNewGame() {
        const name = document.getElementById('player-name').value;
        if (!name.trim()) return alert("Введите имя!");

        const res = await this.apiCall('/games', 'POST', { playerName: name });
        
        this.currentGameId = res.id;
        this.targetWord = res.word;
        this.currentStep = 0;
        this.mistakes = 0;
        this.guessedLetters = new Set();

        document.getElementById('game-id').innerText = res.id;
        document.getElementById('game-result').classList.add('hidden');
        document.getElementById('game-result').className = 'game-result hidden';
        document.getElementById('btn-restart').classList.add('hidden');
        
        this.renderGameUI('game'); 
        this.showScreen('game');
    },

    renderGameUI(prefix) {
        const artContainer = document.getElementById(prefix === 'game' ? 'ascii-art' : 'replay-ascii');
        artContainer.innerText = this.hangmanStates[this.mistakes];
        
        if (prefix === 'game') {
            document.getElementById('mistakes-count').innerText = `${this.mistakes}/${this.maxMistakes}`;
        }

        const wordContainer = document.getElementById(prefix === 'game' ? 'word-display' : 'replay-word');
        wordContainer.innerHTML = '';
        

        let visualWin = true;
        
        for (let char of this.targetWord) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            
            if (this.guessedLetters.has(char)) {
                cell.innerText = char;
            } else {
                if (prefix === 'game' && this.mistakes >= this.maxMistakes) {
                    cell.innerText = char;
                    cell.classList.add('missed');
                } else {
                    cell.innerText = ""; // Пусто
                    visualWin = false;
                }
            }
            wordContainer.appendChild(cell);
        }

        const kbdContainer = document.getElementById(prefix === 'game' ? 'keyboard' : 'replay-keyboard');
        kbdContainer.innerHTML = '';
        const alphabet = "АБВГДЕЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";
        
        for (let char of alphabet) {
            const btn = document.createElement('button');
            btn.innerText = char;
            btn.className = 'alpha-btn';
            
            if (this.guessedLetters.has(char)) {
                btn.classList.add(this.targetWord.includes(char) ? 'correct' : 'wrong');
                btn.disabled = true;
            } else if (prefix === 'game' && this.mistakes >= this.maxMistakes) {
                 btn.disabled = true;
            }

            if (prefix === 'game') {
                btn.onclick = () => this.makeMove(char);
            }
            
            kbdContainer.appendChild(btn);
        }

        return visualWin;
    },

    async makeMove(letter) {
        this.currentStep++;
        this.guessedLetters.add(letter);
        
        const isHit = this.targetWord.includes(letter);
        const result = isHit ? "HIT" : "MISS";
        
        if (!isHit) this.mistakes++;


        const isAllLettersRevealed = this.renderGameUI('game');
        
        let outcome = "PLAYING";
        const resBlock = document.getElementById('game-result');


        if (this.mistakes >= this.maxMistakes) {
            outcome = "LOST";
            this.renderGameUI('game'); 
            
            resBlock.innerText = "ПОРАЖЕНИЕ. Попытки закончились.";
            resBlock.classList.remove('hidden');
            resBlock.classList.add('lose');
            document.getElementById('btn-restart').classList.remove('hidden');
        } 
        else if (isAllLettersRevealed) {
            outcome = "WON";
            resBlock.innerText = "ПОБЕДА! Вы угадали слово.";
            resBlock.classList.remove('hidden');
            resBlock.classList.add('win');
            document.getElementById('btn-restart').classList.remove('hidden');
        }

        await this.apiCall(`/step/${this.currentGameId}`, 'POST', {
            step: this.currentStep,
            letter: letter,
            result: result,
            outcome: outcome
        });
    },


    async loadHistory() {
        this.showScreen('history');
        const tbody = document.getElementById('history-list');
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center">Загрузка...</td></tr>';

        try {
            const games = await this.apiCall('/games');
            tbody.innerHTML = '';
            
            games.forEach(game => {
                const tr = document.createElement('tr');
                
                let badgeClass = '';
                let statusText = '';
                if (game.outcome === 'WON') { badgeClass = 'win'; statusText = 'Победа'; }
                else if (game.outcome === 'LOST') { badgeClass = 'lose'; statusText = 'Поражение'; }
                else { badgeClass = ''; statusText = 'Идет'; }

                tr.innerHTML = `
                    <td>${game.id}</td>
                    <td>${new Date(game.date).toLocaleString('ru-RU')}</td>
                    <td>${game.player_name}</td>
                    <td style="letter-spacing: 2px; font-family: monospace;">${game.outcome === 'PLAYING' ? '****' : game.word}</td>
                    <td><span class="status-badge ${badgeClass}">${statusText}</span></td>
                    <td><button class="btn-small" onclick="app.openReplay(${game.id}, '${game.word}')">Повтор</button></td>
                `;
                tbody.appendChild(tr);
            });
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color: var(--danger)">Ошибка загрузки</td></tr>';
        }
    },


    async openReplay(id, word) {
        const modal = document.getElementById('replay-modal');
        modal.classList.remove('hidden');
        
        document.getElementById('replay-id').innerText = id;
        const msg = document.getElementById('replay-message');
        msg.innerText = "Загрузка ходов...";

        this.targetWord = word;
        this.mistakes = 0;
        this.guessedLetters = new Set();
        this.renderGameUI('replay'); 

        const steps = await this.apiCall(`/games/${id}`);
        
        for (let i = 0; i < steps.length; i++) {
            if (modal.classList.contains('hidden')) return;

            const step = steps[i];
            msg.innerHTML = `Ход ${step.step_number}: Игрок выбрал <b style="color:var(--accent)">${step.letter}</b> (${step.result})`;

            await new Promise(r => setTimeout(r, 800)); 

            this.guessedLetters.add(step.letter);
            if (step.result === 'MISS') this.mistakes++;
            
            this.renderGameUI('replay');
        }
        
        msg.innerText = "Повтор завершен.";
    },

    closeReplay() {
        document.getElementById('replay-modal').classList.add('hidden');
    }
};