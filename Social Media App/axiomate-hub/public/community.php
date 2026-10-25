<?php
if (!isset($db, $action, $uid)) {
    http_response_code(404);
    exit();
}
$db->exec("CREATE TABLE IF NOT EXISTS profile_details(user_id INTEGER PRIMARY KEY REFERENCES users(id),tagline TEXT DEFAULT '',location TEXT DEFAULT '',website TEXT DEFAULT '',pronouns TEXT DEFAULT '',favorite_game TEXT DEFAULT '',accent TEXT DEFAULT 'violet',cover TEXT DEFAULT 'shadow');
CREATE TABLE IF NOT EXISTS profile_images(user_id INTEGER REFERENCES users(id),kind TEXT,mime TEXT,data BLOB,revision TEXT,PRIMARY KEY(user_id,kind));
CREATE TABLE IF NOT EXISTS email_identity(user_id INTEGER PRIMARY KEY REFERENCES users(id),verified_email TEXT,verified_at TEXT);
CREATE TABLE IF NOT EXISTS email_verifications(user_id INTEGER PRIMARY KEY REFERENCES users(id),email TEXT,token_hash TEXT UNIQUE,expires INTEGER,sent_at INTEGER);");
function profileRecord(array $record, ?int $id = null): array
{
    $id ??= (int) ($record["user_id"] ?? $record["id"]);
    $defaults = [
        "tagline" => "",
        "location" => "",
        "website" => "",
        "pronouns" => "",
        "favorite_game" => "",
        "accent" => "violet",
        "cover" => "shadow",
    ];
    $details =
        q(
            "SELECT tagline,location,website,pronouns,favorite_game,accent,cover FROM profile_details WHERE user_id=?",
            [$id],
        )->fetch() ?:
        [];
    $record = array_merge($record, $defaults, $details);
    foreach (["avatar", "banner"] as $kind) {
        $version = q(
            "SELECT revision FROM profile_images WHERE user_id=? AND kind=?",
            [$id, $kind],
        )->fetchColumn();
        $record[$kind . "_url"] = $version
            ? "api.php?action=profile-image&user=" .
                $id .
                "&kind=" .
                $kind .
                "&v=" .
                $version
            : null;
    }
    return $record;
}
function emailStatus(int $id): array
{
    $email = (string) q("SELECT email FROM users WHERE id=?", [
        $id,
    ])->fetchColumn();
    $identity = q("SELECT * FROM email_identity WHERE user_id=?", [
        $id,
    ])->fetch();
    $pending = q(
        "SELECT email,sent_at,expires FROM email_verifications WHERE user_id=?",
        [$id],
    )->fetch();
    return [
        "email_verified" =>
            (bool) ($identity && $identity["verified_email"] === $email),
        "email_verified_at" =>
            $identity && $identity["verified_email"] === $email
                ? $identity["verified_at"]
                : null,
        "pending_email" =>
            $pending &&
            $pending["email"] !== $email &&
            $pending["expires"] > time()
                ? $pending["email"]
                : null,
        "verification_retry_at" => $pending
            ? (int) $pending["sent_at"] + 60
            : 0,
    ];
}
function sendVerification(int $id, ?string $target = null): bool
{
    global $dir;
    $user = q("SELECT email FROM users WHERE id=?", [$id])->fetch();
    if (!$user) {
        return false;
    }
    $target ??= $user["email"];
    $last = q("SELECT sent_at FROM email_verifications WHERE user_id=?", [
        $id,
    ])->fetchColumn();
    if ($last && time() - (int) $last < 60) {
        fail("Please wait a minute before requesting another email.", 429);
    }
    $token = bin2hex(random_bytes(32));
    $hash = hash("sha256", $token);
    $now = time();
    q(
        "INSERT INTO email_verifications(user_id,email,token_hash,expires,sent_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET email=excluded.email,token_hash=excluded.token_hash,expires=excluded.expires,sent_at=excluded.sent_at",
        [$id, $target, $hash, $now + 3600, $now],
    );
    $origin =
        PHP_SAPI === "cli-server"
            ? "http://localhost:8787"
            : "https://axiomatehub.com";
    $link = $origin . "/#verify-email=" . $token;
    $message =
        "Verify your email for Axiomate Hub\n\nOpen this link and choose Confirm email:\n" .
        $link .
        "\n\nThis link expires in one hour and can only be used once. If you did not request this, you can ignore this email.\n\nAxiomate Games\nhttps://axiomatehub.com\n";
    $sent = false;
    if (PHP_SAPI === "cli-server" && getenv("AXIOMATE_MAIL_CAPTURE") === "1") {
        $sent =
            file_put_contents(
                $dir . "/mail-capture.jsonl",
                json_encode([
                    "to" => $target,
                    "link" => $link,
                    "time" => $now,
                ]) . "\n",
                FILE_APPEND | LOCK_EX,
            ) !== false;
    } elseif (PHP_SAPI !== "cli-server" && function_exists("mail")) {
        try {
            $sent = @mail(
                $target,
                "Verify your Axiomate Hub email",
                $message,
                [
                    "From" => "Axiomate Hub <no-reply@axiomatehub.com>",
                    "MIME-Version" => "1.0",
                    "Content-Type" => "text/plain; charset=UTF-8",
                ],
                "-fno-reply@axiomatehub.com",
            );
        } catch (Throwable $error) {
            $sent = false;
        }
    }
    if (!$sent) {
        q("DELETE FROM email_verifications WHERE user_id=? AND token_hash=?", [
            $id,
            $hash,
        ]);
        error_log("Axiomate verification transport did not accept message.");
    }
    return $sent;
}
if (
    in_array(
        $action,
        ["verification-send", "verification-confirm", "verification-cancel"],
        true,
    )
) {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        fail("Method not allowed.", 405);
    }
    if ($action === "verification-confirm") {
        limitAction("verify-token", 30, 900);
        $token = (string) ($input["token"] ?? "");
        if (!preg_match('/^[a-f0-9]{64}$/', $token)) {
            fail("This verification link is invalid or expired.", 400);
        }
        $db->beginTransaction();
        $pending = q(
            "SELECT * FROM email_verifications WHERE token_hash=? AND expires>?",
            [hash("sha256", $token), time()],
        )->fetch();
        if (!$pending) {
            $db->rollBack();
            fail(
                "This verification link is invalid, expired, or already used. Request a new one in Settings.",
                400,
            );
        }
        if (
            q("SELECT id FROM users WHERE email=? AND id!=?", [
                $pending["email"],
                $pending["user_id"],
            ])->fetchColumn()
        ) {
            $db->rollBack();
            fail(
                "This email address is already in use. Choose a different address in Settings.",
            );
        }
        q("UPDATE users SET email=? WHERE id=?", [
            $pending["email"],
            $pending["user_id"],
        ]);
        q(
            "INSERT INTO email_identity(user_id,verified_email,verified_at) VALUES(?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id) DO UPDATE SET verified_email=excluded.verified_email,verified_at=excluded.verified_at",
            [$pending["user_id"], $pending["email"]],
        );
        q("DELETE FROM email_verifications WHERE user_id=?", [
            $pending["user_id"],
        ]);
        $db->commit();
        out(["ok" => true]);
    }
    if (!$uid) {
        fail("Please sign in first.", 401);
    }
    if ($action === "verification-cancel") {
        q("DELETE FROM email_verifications WHERE user_id=?", [$uid]);
        out(["ok" => true]);
    }
    limitAction("verification-send-" . $uid, 8, 3600);
    $pending = q(
        "SELECT email FROM email_verifications WHERE user_id=? AND expires>?",
        [$uid, time()],
    )->fetchColumn();
    if (!$pending && emailStatus($uid)["email_verified"]) {
        out(["ok" => true, "already_verified" => true]);
    }
    if (!sendVerification($uid, $pending ?: null)) {
        fail(
            "We could not send the email right now. Please try again later.",
            503,
        );
    }
    out(["ok" => true]);
}
if ($action === "profile-image") {
    if (!$uid) {
        fail("Please sign in first.", 401);
    }
    $kind = (string) ($input["kind"] ?? ($_GET["kind"] ?? "avatar"));
    if (!in_array($kind, ["avatar", "banner"], true)) {
        fail("Invalid image type.");
    }
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        $image = q(
            "SELECT mime,data FROM profile_images WHERE user_id=? AND kind=?",
            [(int) ($_GET["user"] ?? $uid), $kind],
        )->fetch();
        if (!$image) {
            fail("Image not found.", 404);
        }
        header("Content-Type: " . $image["mime"]);
        header("Cache-Control: private, max-age=300");
        header("Content-Security-Policy: default-src 'none'");
        echo $image["data"];
        exit();
    }
    limitAction("profile-image-" . $uid, 30, 3600);
    if (!empty($input["remove"])) {
        q("DELETE FROM profile_images WHERE user_id=? AND kind=?", [
            $uid,
            $kind,
        ]);
        out(["ok" => true, "url" => null]);
    }
    $data = (string) ($input["data"] ?? "");
    if (
        !preg_match(
            '#^data:image/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$#D',
            $data,
            $match,
        )
    ) {
        fail("Choose a JPEG, PNG, or WebP image.");
    }
    $bytes = base64_decode($match[2], true);
    if ($bytes === false || strlen($bytes) > 1048576) {
        fail("The image must be smaller than 1 MB after resizing.");
    }
    $size = @getimagesizefromstring($bytes);
    if (
        !$size ||
        !in_array(
            $size[2],
            [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP],
            true,
        ) ||
        $size[0] < 16 ||
        $size[1] < 16 ||
        $size[0] > 2400 ||
        $size[1] > 2400 ||
        $size[0] * $size[1] > 4000000
    ) {
        fail(
            "Use a JPEG, PNG, or WebP image between 16 and 2400 pixels per side.",
        );
    }
    if (!function_exists("imagecreatefromstring")) {
        fail("Image processing is temporarily unavailable.", 503);
    }
    $source = @imagecreatefromstring($bytes);
    if (!$source) {
        fail("This image could not be read.");
    }
    $max = $kind === "avatar" ? 512 : 1600;
    $scale = min(1, $max / max($size[0], $size[1]));
    $w = max(1, (int) round($size[0] * $scale));
    $h = max(1, (int) round($size[1] * $scale));
    $canvas = imagecreatetruecolor($w, $h);
    imagefill($canvas, 0, 0, imagecolorallocate($canvas, 15, 12, 22));
    imagecopyresampled(
        $canvas,
        $source,
        0,
        0,
        0,
        0,
        $w,
        $h,
        $size[0],
        $size[1],
    );
    ob_start();
    imagejpeg($canvas, null, 88);
    $clean = ob_get_clean();
    imagedestroy($source);
    imagedestroy($canvas);
    $revision = bin2hex(random_bytes(8));
    q(
        "INSERT INTO profile_images(user_id,kind,mime,data,revision) VALUES(?,?,?,?,?) ON CONFLICT(user_id,kind) DO UPDATE SET mime=excluded.mime,data=excluded.data,revision=excluded.revision",
        [$uid, $kind, "image/jpeg", $clean, $revision],
    );
    out([
        "ok" => true,
        "url" =>
            "api.php?action=profile-image&user=" .
            $uid .
            "&kind=" .
            $kind .
            "&v=" .
            $revision,
    ]);
}
function saveProfile(int $id, array $input): void
{
    $name = trim((string) ($input["name"] ?? ""));
    $bio = trim((string) ($input["bio"] ?? ""));
    if ($name === "" || mb_strlen($name) > 40 || mb_strlen($bio) > 160) {
        fail("Use a name up to 40 characters and a bio up to 160.");
    }
    $old =
        q("SELECT * FROM profile_details WHERE user_id=?", [$id])->fetch() ?:
        [];
    $values = [];
    foreach (
        [
            "tagline" => 60,
            "location" => 60,
            "website" => 200,
            "pronouns" => 30,
            "favorite_game" => 60,
        ]
        as $field => $max
    ) {
        $value = trim((string) ($input[$field] ?? ($old[$field] ?? "")));
        if (mb_strlen($value) > $max) {
            fail("The " . $field . " field is too long.");
        }
        $values[$field] = $value;
    }
    if (
        $values["website"] !== "" &&
        (!filter_var($values["website"], FILTER_VALIDATE_URL) ||
            !in_array(
                strtolower(
                    (string) parse_url($values["website"], PHP_URL_SCHEME),
                ),
                ["https", "http"],
                true,
            ))
    ) {
        fail("Use a complete http:// or https:// website address.");
    }
    $accent = (string) ($input["accent"] ?? ($old["accent"] ?? "violet"));
    $cover = (string) ($input["cover"] ?? ($old["cover"] ?? "shadow"));
    if (
        !in_array($accent, ["violet", "cyan", "rose", "amber"], true) ||
        !in_array($cover, ["shadow", "eclipse", "frost", "ember"], true)
    ) {
        fail("Choose a valid profile color.");
    }
    q("UPDATE users SET name=?,bio=? WHERE id=?", [$name, $bio, $id]);
    q(
        "INSERT INTO profile_details(user_id,tagline,location,website,pronouns,favorite_game,accent,cover) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET tagline=excluded.tagline,location=excluded.location,website=excluded.website,pronouns=excluded.pronouns,favorite_game=excluded.favorite_game,accent=excluded.accent,cover=excluded.cover",
        [$id, ...array_values($values), $accent, $cover],
    );
}
