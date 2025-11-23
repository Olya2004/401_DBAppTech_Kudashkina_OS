<?php

$dbFile = __DIR__ . '/../db/hangman.db';

try {
    $pdo = new PDO("sqlite:$dbFile");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $pdo->exec("CREATE TABLE IF NOT EXISTS games (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT,
        player_name TEXT,
        word TEXT,
        outcome TEXT
    )");

    $pdo->exec("CREATE TABLE IF NOT EXISTS steps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id INTEGER,
        step_number INTEGER,
        letter TEXT,
        result TEXT,
        FOREIGN KEY(game_id) REFERENCES games(id)
    )");

    $dictionary = ["СЕРВЕР", "КЛИЕНТ", "СКРИПТ", "ПРОЕКТ", "ДОМЕНЫ", "ПАРОЛЬ", "БАЙТЫ", "ФАЙЛЫ"];

} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error: ' . $e->getMessage()]);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

if ($uri === '/' || $uri === '/index.html') {
    include 'index.html';
    exit;
}

header('Content-Type: application/json');

$input = json_decode(file_get_contents('php://input'), true);


if ($method === 'GET' && $uri === '/games') {
    $stmt = $pdo->query("SELECT * FROM games ORDER BY id DESC");
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

if ($method === 'GET' && preg_match('#^/games/(\d+)$#', $uri, $matches)) {
    $gameId = $matches[1];
    $stmt = $pdo->prepare("SELECT * FROM steps WHERE game_id = ? ORDER BY step_number ASC");
    $stmt->execute([$gameId]);
    echo json_encode($stmt->fetchAll(PDO::FETCH_ASSOC));
    exit;
}

if ($method === 'POST' && $uri === '/games') {
    $playerName = $input['playerName'] ?? 'Unknown';
    $date = date('Y-m-d H:i:s');
    $word = $dictionary[array_rand($dictionary)];
    $outcome = 'PLAYING';

    $stmt = $pdo->prepare("INSERT INTO games (date, player_name, word, outcome) VALUES (?, ?, ?, ?)");
    $stmt->execute([$date, $playerName, $word, $outcome]);
    
    $gameId = $pdo->lastInsertId();
    
    echo json_encode([
        'id' => $gameId,
        'word' => $word,
        'status' => 'success'
    ]);
    exit;
}

if ($method === 'POST' && preg_match('#^/step/(\d+)$#', $uri, $matches)) {
    $gameId = $matches[1];
    
    // Записываем шаг
    $stmt = $pdo->prepare("INSERT INTO steps (game_id, step_number, letter, result) VALUES (?, ?, ?, ?)");
    $stmt->execute([
        $gameId,
        $input['step'],
        $input['letter'],
        $input['result']
    ]);

    if (isset($input['outcome']) && $input['outcome'] !== 'PLAYING') {
        $updateStmt = $pdo->prepare("UPDATE games SET outcome = ? WHERE id = ?");
        $updateStmt->execute([$input['outcome'], $gameId]);
    }

    echo json_encode(['status' => 'saved']);
    exit;
}

http_response_code(404);
echo json_encode(['error' => 'Not Found']);