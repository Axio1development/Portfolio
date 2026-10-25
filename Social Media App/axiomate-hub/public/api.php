<?php
declare(strict_types=1);
ini_set("display_errors", "0");
ini_set("session.use_strict_mode", "1");
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");
session_set_cookie_params([
    "httponly" => true,
    "secure" => !empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off",
    "samesite" => "Lax",
    "path" => "/",
]);
session_start();
function out(mixed $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode(
        $data,
        JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE,
    );
    exit();
}
function fail(string $message, int $status = 400): never
{
    out(["error" => $message], $status);
}
try {
    $dir =
        getenv("AXIOMATE_DATA_DIR") ?:
        dirname(__DIR__, 2) . "/axiomate-private";
    if (!is_dir($dir) && !mkdir($dir, 0700, true)) {
        throw new RuntimeException("Storage unavailable");
    }
    $db = new PDO("sqlite:" . $dir . "/hub.sqlite", null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $db->exec(
        "PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL;",
    );
    $db->exec("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY,username TEXT UNIQUE COLLATE NOCASE,email TEXT UNIQUE COLLATE NOCASE,password TEXT,name TEXT,bio TEXT DEFAULT '',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),body TEXT,parent_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE TABLE IF NOT EXISTS likes(user_id INTEGER REFERENCES users(id),post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,PRIMARY KEY(user_id,post_id));
 CREATE TABLE IF NOT EXISTS bookmarks(user_id INTEGER REFERENCES users(id),post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,PRIMARY KEY(user_id,post_id));
 CREATE TABLE IF NOT EXISTS follows(user_id INTEGER REFERENCES users(id),target_id INTEGER REFERENCES users(id),PRIMARY KEY(user_id,target_id));
 CREATE TABLE IF NOT EXISTS attempts(key TEXT PRIMARY KEY,count INTEGER,started INTEGER);
 CREATE TABLE IF NOT EXISTS account_settings(user_id INTEGER PRIMARY KEY REFERENCES users(id),preferences TEXT DEFAULT '{}',auth_version INTEGER DEFAULT 1);
 CREATE TABLE IF NOT EXISTS passkeys(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),credential_id TEXT UNIQUE,public_key TEXT,counter INTEGER DEFAULT 0,label TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP,last_used TEXT);
 CREATE TABLE IF NOT EXISTS notifications(id INTEGER PRIMARY KEY,user_id INTEGER REFERENCES users(id),actor_id INTEGER REFERENCES users(id),kind TEXT,post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,is_read INTEGER DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
 CREATE INDEX IF NOT EXISTS notifications_user ON notifications(user_id,id);
 CREATE INDEX IF NOT EXISTS posts_parent ON posts(parent_id,id);
 CREATE INDEX IF NOT EXISTS posts_user ON posts(user_id,id);");
    function q(string $sql, array $args = []): PDOStatement
    {
        global $db;
        $s = $db->prepare($sql);
        $s->execute($args);
        return $s;
    }
    function limitAction(string $scope, int $max, int $seconds): void
    {
        $key = hash("sha256", $scope . ($_SERVER["REMOTE_ADDR"] ?? "local"));
        $now = time();
        q(
            "INSERT INTO attempts(key,count,started) VALUES(?,0,?) ON CONFLICT(key) DO NOTHING",
            [$key, $now],
        );
        q("UPDATE attempts SET count=0,started=? WHERE key=? AND started<?", [
            $now,
            $key,
            $now - $seconds,
        ]);
        q("UPDATE attempts SET count=count+1 WHERE key=?", [$key]);
        if (
            (int) q("SELECT count FROM attempts WHERE key=?", [
                $key,
            ])->fetchColumn() > $max
        ) {
            fail("Too many attempts. Please try again later.", 429);
        }
    }
    $_SESSION["csrf"] ??= bin2hex(random_bytes(32));
    $action = $_GET["action"] ?? "session";
    $uid = (int) ($_SESSION["uid"] ?? 0);
    if ($uid) {
        $version =
            (int) (q(
                "SELECT auth_version FROM account_settings WHERE user_id=?",
                [$uid],
            )->fetchColumn() ?:
            1);
        if ((int) ($_SESSION["auth_version"] ?? 1) !== $version) {
            unset($_SESSION["uid"]);
            $uid = 0;
        }
    }
    if (isset($_SESSION["seen"]) && time() - $_SESSION["seen"] > 604800) {
        unset($_SESSION["uid"]);
        $uid = 0;
    }
    $_SESSION["seen"] = time();
    $input = [];
    if ($_SERVER["REQUEST_METHOD"] === "POST") {
        if (
            !hash_equals($_SESSION["csrf"], $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "")
        ) {
            fail("Session expired. Refresh and try again.", 403);
        }
        if (
            (int) ($_SERVER["CONTENT_LENGTH"] ?? 0) >
            ($action === "video-post"
                ? 51 * 1024 * 1024
                : ($action === "profile-image"
                    ? 1500000
                    : 12000))
        ) {
            fail("Request too large.", 413);
        }
        $input =
            $action === "video-post"
                ? $_POST
                : json_decode(file_get_contents("php://input"), true) ?? [];
        if (!is_array($input)) {
            fail("Invalid request.");
        }
    } elseif (
        $_SERVER["REQUEST_METHOD"] !== "GET" &&
        !($_SERVER["REQUEST_METHOD"] === "HEAD" && $action === "video")
    ) {
        fail("Method not allowed.", 405);
    }
    require __DIR__ . "/video.php";
    require __DIR__ . "/community.php";
    if ($action === "session") {
        out([
            "user" => $uid
                ? profileRecord(
                    q(
                        "SELECT id,username,name,bio,created_at FROM users WHERE id=?",
                        [$uid],
                    )->fetch(),
                )
                : null,
            "csrf" => $_SESSION["csrf"],
        ]);
    }
    require __DIR__ . "/account.php";
    if (in_array($action, ["login", "register"], true)) {
        if ($_SERVER["REQUEST_METHOD"] !== "POST") {
            fail("Method not allowed.", 405);
        }
        limitAction("auth", 20, 900);
        $password = (string) ($input["password"] ?? "");
        if ($action === "register") {
            limitAction("register", 5, 3600);
            $username = trim((string) ($input["username"] ?? ""));
            $email = strtolower(trim((string) ($input["email"] ?? "")));
            $name = trim((string) ($input["name"] ?? ""));
            if (!preg_match('/^[a-zA-Z0-9_]{3,20}$/', $username)) {
                fail(
                    "Choose a username with 3–20 letters, numbers, or underscores.",
                );
            }
            if (
                !filter_var($email, FILTER_VALIDATE_EMAIL) ||
                strlen($email) > 254
            ) {
                fail("Enter a valid email address.");
            }
            if (strlen($password) < 12 || strlen($password) > 72) {
                fail("Use a password between 12 and 72 characters.");
            }
            if ($name === "" || mb_strlen($name) > 40) {
                fail("Your display name must be 1–40 characters.");
            }
            try {
                q(
                    "INSERT INTO users(username,email,password,name) VALUES(?,?,?,?)",
                    [
                        $username,
                        $email,
                        password_hash($password, PASSWORD_DEFAULT),
                        $name,
                    ],
                );
            } catch (PDOException $e) {
                if ($e->getCode() === "23000") {
                    fail("That username or email is already registered.");
                }
                throw $e;
            }
            $uid = (int) $db->lastInsertId();
            sendVerification($uid);
        } else {
            $login = trim((string) ($input["login"] ?? ""));
            $user = q("SELECT * FROM users WHERE username=? OR email=?", [
                $login,
                $login,
            ])->fetch();
            $valid = password_verify(
                $password,
                $user["password"] ??
                    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
            );
            if (!$user || !$valid) {
                fail("Username or password is incorrect.", 401);
            }
            $uid = (int) $user["id"];
        }
        session_regenerate_id(true);
        $_SESSION["uid"] = $uid;
        $_SESSION["auth_version"] =
            (int) (q(
                "SELECT auth_version FROM account_settings WHERE user_id=?",
                [$uid],
            )->fetchColumn() ?:
            1);
        $_SESSION["csrf"] = bin2hex(random_bytes(32));
        out(["ok" => true]);
    }
    if (!$uid) {
        fail("Please sign in to enter the Hub.", 401);
    }
    $mutations = [
        "logout",
        "post",
        "like",
        "bookmark",
        "follow",
        "profile",
        "delete",
    ];
    if (
        in_array($action, $mutations, true) &&
        $_SERVER["REQUEST_METHOD"] !== "POST"
    ) {
        fail("Method not allowed.", 405);
    }
    if ($action === "logout") {
        $_SESSION = [];
        session_regenerate_id(true);
        out(["ok" => true]);
    }
    if ($action === "post") {
        limitAction("post-" . $uid, 30, 600);
        $body = trim((string) ($input["body"] ?? ""));
        if ($body === "" || mb_strlen($body) > 500) {
            fail("Posts must contain 1–500 characters.");
        }
        $parent = isset($input["parent_id"]) ? (int) $input["parent_id"] : null;
        if (
            $parent &&
            !q("SELECT id FROM posts WHERE id=?", [$parent])->fetch()
        ) {
            fail("Post not found.", 404);
        }
        q("INSERT INTO posts(user_id,body,parent_id) VALUES(?,?,?)", [
            $uid,
            $body,
            $parent,
        ]);
        $newId = (int) $db->lastInsertId();
        if ($parent) {
            $owner = (int) q("SELECT user_id FROM posts WHERE id=?", [
                $parent,
            ])->fetchColumn();
            notify($owner, $uid, "reply", $parent);
        }
        out(["ok" => true, "id" => $newId]);
    }
    if ($action === "delete") {
        deletePostWithMedia((int) ($input["id"] ?? 0), $uid);
        out(["ok" => true]);
    }
    if ($action === "like" || $action === "bookmark") {
        $id = (int) ($input["id"] ?? 0);
        if (!q("SELECT id FROM posts WHERE id=?", [$id])->fetch()) {
            fail("Post not found.", 404);
        }
        $table = $action === "like" ? "likes" : "bookmarks";
        $exists = q("SELECT 1 FROM $table WHERE user_id=? AND post_id=?", [
            $uid,
            $id,
        ])->fetchColumn();
        if ($exists) {
            q("DELETE FROM $table WHERE user_id=? AND post_id=?", [$uid, $id]);
        } else {
            q("INSERT OR IGNORE INTO $table(user_id,post_id) VALUES(?,?)", [
                $uid,
                $id,
            ]);
            if ($action === "like") {
                notify(
                    (int) q("SELECT user_id FROM posts WHERE id=?", [
                        $id,
                    ])->fetchColumn(),
                    $uid,
                    "like",
                    $id,
                );
            }
        }
        out([
            "active" => !$exists,
            "likes" => (int) q("SELECT COUNT(*) FROM likes WHERE post_id=?", [
                $id,
            ])->fetchColumn(),
        ]);
    }
    if ($action === "follow") {
        $id = (int) ($input["id"] ?? 0);
        if (
            $id === $uid ||
            !q("SELECT id FROM users WHERE id=?", [$id])->fetch()
        ) {
            fail("Invalid member.");
        }
        $exists = q("SELECT 1 FROM follows WHERE user_id=? AND target_id=?", [
            $uid,
            $id,
        ])->fetchColumn();
        if ($exists) {
            q("DELETE FROM follows WHERE user_id=? AND target_id=?", [
                $uid,
                $id,
            ]);
        } else {
            q("INSERT OR IGNORE INTO follows(user_id,target_id) VALUES(?,?)", [
                $uid,
                $id,
            ]);
            notify($id, $uid, "follow", null);
        }
        out(["active" => !$exists]);
    }
    if ($action === "profile") {
        saveProfile($uid, $input);
        out([
            "ok" => true,
            "profile" => profileRecord(
                q(
                    "SELECT id,username,name,bio,created_at FROM users WHERE id=?",
                    [$uid],
                )->fetch(),
            ),
        ]);
    }
    if ($action === "members") {
        out(
            array_map(
                "profileRecord",
                q(
                    "SELECT id,username,name,bio,EXISTS(SELECT 1 FROM follows WHERE user_id=? AND target_id=users.id) AS following FROM users WHERE id!=? ORDER BY id DESC LIMIT 5",
                    [$uid, $uid],
                )->fetchAll(),
            ),
        );
    }
    if ($action === "member") {
        $id = (int) ($_GET["id"] ?? $uid);
        $member = q(
            "SELECT id,username,name,bio,created_at,(SELECT COUNT(*) FROM follows WHERE target_id=users.id) AS followers,(SELECT COUNT(*) FROM follows WHERE user_id=users.id) AS following_count,EXISTS(SELECT 1 FROM follows WHERE user_id=? AND target_id=users.id) AS following FROM users WHERE id=?",
            [$uid, $id],
        )->fetch();
        if (!$member) {
            fail("Member not found.", 404);
        }
        out(profileRecord($member));
    }
    if ($action === "feed") {
        $where = "p.parent_id IS NULL";
        $args = [$uid, $uid];
        $view = $_GET["view"] ?? "all";
        if ($view === "following") {
            $where .=
                " AND p.user_id IN (SELECT target_id FROM follows WHERE user_id=?)";
            $args[] = $uid;
        }
        if ($view === "bookmarks") {
            $where .=
                " AND p.id IN (SELECT post_id FROM bookmarks WHERE user_id=?)";
            $args[] = $uid;
        }
        if (isset($_GET["user"])) {
            $where .= " AND p.user_id=?";
            $args[] = (int) $_GET["user"];
        }
        if (isset($_GET["id"])) {
            $where = "p.id=?";
            $args[] = (int) $_GET["id"];
        }
        if (isset($_GET["parent"])) {
            $where = "p.parent_id=?";
            $args[] = (int) $_GET["parent"];
        }
        if (!empty($_GET["q"])) {
            $where .=
                " AND (p.body LIKE ? OR u.name LIKE ? OR u.username LIKE ?)";
            $term = "%" . mb_substr((string) $_GET["q"], 0, 100) . "%";
            array_push($args, $term, $term, $term);
        }
        $before = (int) ($_GET["before"] ?? 0);
        if ($before) {
            $where .= " AND p.id<?";
            $args[] = $before;
        }
        out(
            array_map(
                fn($p) => videoRecord(profileRecord($p)),
                q(
                    "SELECT p.*,u.name,u.username,(SELECT COUNT(*) FROM likes WHERE post_id=p.id) AS likes,(SELECT COUNT(*) FROM posts WHERE parent_id=p.id) AS replies,EXISTS(SELECT 1 FROM likes WHERE post_id=p.id AND user_id=?) AS liked,EXISTS(SELECT 1 FROM bookmarks WHERE post_id=p.id AND user_id=?) AS bookmarked FROM posts p JOIN users u ON u.id=p.user_id WHERE $where ORDER BY p.id DESC LIMIT 30",
                    $args,
                )->fetchAll(),
            ),
        );
    }
    fail("Not found.", 404);
} catch (Throwable $e) {
    error_log("Axiomate Hub: " . $e->getMessage());
    out(
        [
            "error" =>
                "The Hub is temporarily unavailable. Please try again shortly.",
        ],
        500,
    );
}
