#!/bin/sh
cd "$(dirname "$0")"
php -d extension_dir="/c/Users/kingl/AppData/Local/Microsoft/WinGet/Packages/PHP.PHP.8.3_Microsoft.Winget.Source_8wekyb3d8bbwe/ext" -d extension=pdo_sqlite -d extension=sqlite3 -d extension=openssl -d extension=mbstring -S localhost:8000 -t public dev-router.php
