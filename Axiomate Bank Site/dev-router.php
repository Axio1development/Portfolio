<?php

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$root = __DIR__ . '/public';
if ($path !== '/' && is_file($root . $path)) {
    return false;
}

if (is_dir($root . $path)) {
    $directory = $root . rtrim($path, '/');
    if (is_file($directory . '/index.php')) {
        chdir($directory);
        require $directory . '/index.php';
        return true;
    }
    return false;
}

if (is_file($root . $path . '.html')) {
    readfile($root . $path . '.html');
    return true;
}

http_response_code(404);
readfile($root . '/404.html');
