##                             Лабораторная работа 9. Создание веб-приложения с помощью микрофреймворка Slim

Перевести backend приложения, разработанного в л/р 8, на микрофреймворк Slim. Файловая структура приложения и способ его запуска должны остаться прежними.

### Просмотр видеолекций
* Видеолекции для данного задания: "Frontend и backend. Веб-приложения на PHP" https://youtu.be/nngT3DShFF4,"Веб-приложения на PHP. Часть 2" https://youtu.be/z3lmJndVIho (МГУ им. Н.П. Огарева, апрель 2021 года)
**Посмотреть обязательно!**

### Создание новой ветки в локальном Git-репозитории.
* Создать в локальном репозитории ветку Task09. Далее работать в этой ветке в каталоге Task09.


### Создание backend-части приложения с помощью микрофреймворка Slim
* В каталоге Task09 устанавливаем через Composer минимально необходимые пакеты для Slim:
```
composer require slim/slim slim/psr7 slim/http
``` 
В результате должны создаться файлы Task09/composer.json, Task09/composer.lock и каталог Task09/vendor.
* Создаем точку входа Task09/public/index.php. Больше никаких PHP-файлов в Task09/public быть не должно.
* Задаем в index.php маршруты запросов и их обработчики. Пример:
```PHP
<?php

require __DIR__ . '/../vendor/autoload.php';

use Slim\Factory\AppFactory;

$app = AppFactory::create();
$app->addErrorMiddleware(true, true, true);

$app->get('/', function ($request, $response) {
    $response->write('Здесь должен открыться index.html');
    return $response;
});


$app->get('/games', function ($request, $response) {
    $response->write('Здесь должен вернуться JSON с данными о всех играх');
    return $response;
});

$app->post('/games', function ($request, $response) {
    $response->write('Здесь должен приняться JSON с данными о новой игре и записаться в БД');
    return $response;
});

$app->run();

```
* Приложение должно запускаться в браузере по адресам http://localhost:3000/index.html или просто http://localhost:3000, поэтому при получении GET-запроста на корневой адрес /, должна сработать переадресация на /index.html.

### Доработка документации проекта
* В файле README.md должен быть описан процесс запуска приложения.

### Отправка задания на проверку
* Отправить созданный коммит в "форкнутый" репозиторий на GitHub (`git push origin`).
* Сделать Pull Request для добавления ветки Task08 из репозитория в вашем профиле в https://github.com/andpop-mrsu.
* Задание будет считаться принятым после закрытия Pull Request в https://github.com/andpop-mrsu.
* После принятия задания преподавателем синхронизировать с оригинальным свой локальный репозиторий (`git pull upstream master`), потом репозиторий в своем профиле GitHub (`git push origin master`).
### Доработка документации проекта
* В файле README.md должен быть описан процесс запуска приложения.

