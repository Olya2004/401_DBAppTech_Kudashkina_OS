<?php

require __DIR__ . '/../vendor/autoload.php';

use Slim\Factory\AppFactory;
use Psr\Http\Message\ResponseInterface as Response;
use Psr\Http\Message\ServerRequestInterface as Request;
use Slim\Psr7\Response as SlimResponse;

$app = AppFactory::create();
$app->addErrorMiddleware(true, true, true);

$dbFile = __DIR__ . '/../db/hangman.db';

$dictionary = ["СЕРВЕР", "КЛИЕНТ", "СКРИПТ", "ПРОЕКТ", "ДОМЕНЫ", "ПАРОЛЬ", "БАЙТЫ", "ФАЙЛЫ"];

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
} catch (PDOException $e) {
    $response = new SlimResponse();
    $response->withStatus(500)
             ->withHeader('Content-Type', 'application/json')
             ->getBody()
             ->write(json_encode(['error' => 'Database error: ' . $e->getMessage()]));
    echo $response;
    exit;
}

$app->get('/', function (Request $request, Response $response) {
    $filePath = __DIR__ . '/index.html';
    if (file_exists($filePath)) {
        $response->getBody()->write(file_get_contents($filePath));
        return $response->withHeader('Content-Type', 'text/html');
    }
    return $response->withStatus(404)->withHeader('Content-Type', 'application/json')
                    ->getBody()->write(json_encode(['error' => 'index.html not found']));
});

$app->get('/games', function (Request $request, Response $response) use ($pdo) {
    try {
        $stmt = $pdo->query("SELECT * FROM games ORDER BY id DESC");
        $games = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response->getBody()->write(json_encode($games));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
});

$app->get('/games/{id}', function (Request $request, Response $response, $args) use ($pdo) {
    $gameId = $args['id'];
    try {
        $stmt = $pdo->prepare("SELECT * FROM steps WHERE game_id = ? ORDER BY step_number ASC");
        $stmt->execute([$gameId]);
        $steps = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $response->getBody()->write(json_encode($steps));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
});

$app->post('/games', function (Request $request, Response $response) use ($pdo, $dictionary) {
    $input = $request->getParsedBody();
    $playerName = $input['playerName'] ?? 'Unknown';
    $date = date('Y-m-d H:i:s');
    $word = $dictionary[array_rand($dictionary)];
    $outcome = 'PLAYING';

    try {
        $stmt = $pdo->prepare("INSERT INTO games (date, player_name, word, outcome) VALUES (?, ?, ?, ?)");
        $stmt->execute([$date, $playerName, $word, $outcome]);
        $gameId = $pdo->lastInsertId();

        $data = [
            'id' => (int)$gameId,
            'word' => $word,
            'status' => 'success'
        ];
        $response->getBody()->write(json_encode($data));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
});

$app->post('/step/{id}', function (Request $request, Response $response, $args) use ($pdo) {
    $gameId = $args['id'];
    $input = $request->getParsedBody();

    try {
        $stmt = $pdo->prepare("INSERT INTO steps (game_id, step_number, letter, result) VALUES (?, ?, ?, ?)");
        $stmt->execute([
            $gameId,
            $input['step'] ?? 0,
            $input['letter'] ?? '',
            $input['result'] ?? ''
        ]);

        if (isset($input['outcome']) && $input['outcome'] !== 'PLAYING') {
            $updateStmt = $pdo->prepare("UPDATE games SET outcome = ? WHERE id = ?");
            $updateStmt->execute([$input['outcome'], $gameId]);
        }

        $response->getBody()->write(json_encode(['status' => 'saved']));
        return $response->withHeader('Content-Type', 'application/json');
    } catch (Exception $e) {
        $response->getBody()->write(json_encode(['error' => $e->getMessage()]));
        return $response->withStatus(500)->withHeader('Content-Type', 'application/json');
    }
});

$app->run();