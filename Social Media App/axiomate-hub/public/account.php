<?php
if (!isset($db, $action, $uid)) {
    http_response_code(404);
    exit();
}
function notify(int $to, int $actor, string $kind, ?int $post): void
{
    if ($to === $actor) {
        return;
    }
    if (
        q(
            'SELECT 1 FROM notifications WHERE user_id=? AND actor_id=? AND kind=? AND post_id IS ? AND created_at>datetime(\'now\',\'-1 day\')',
            [$to, $actor, $kind, $post],
        )->fetchColumn()
    ) {
        return;
    }
    q(
        "INSERT INTO notifications(user_id,actor_id,kind,post_id) VALUES(?,?,?,?)",
        [$to, $actor, $kind, $post],
    );
}
function b64u(string $value): string
{
    return rtrim(strtr(base64_encode($value), "+/", "-_"), "=");
}
function unb64(string $value): string
{
    $decoded = base64_decode(strtr($value, "-_", "+/"), true);
    if ($decoded === false) {
        fail("Invalid passkey response.");
    }
    return $decoded;
}
function requirePassword(int $uid, array $input): void
{
    limitAction("sensitive-" . $uid, 12, 900);
    $hash = q("SELECT password FROM users WHERE id=?", [$uid])->fetchColumn();
    if (
        !password_verify(
            (string) ($input["current_password"] ?? ""),
            (string) $hash,
        )
    ) {
        fail("Your current password is incorrect.", 403);
    }
}
function prefs(int $uid): array
{
    return array_merge(
        [
            "theme" => "midnight",
            "density" => "comfortable",
            "reduced_motion" => false,
        ],
        json_decode(
            q("SELECT preferences FROM account_settings WHERE user_id=?", [
                $uid,
            ])->fetchColumn() ?:
            "{}",
            true,
        ) ?:
        [],
    );
}
function passkeyOrigin(): array
{
    if (PHP_SAPI === "cli-server") {
        return ["localhost", "http://localhost:8787"];
    }
    return ["axiomatehub.com", "https://axiomatehub.com"];
}
if (str_starts_with($action, "passkey-")) {
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        fail("Method not allowed.", 405);
    }
    if (
        !in_array(
            $action,
            ["passkey-login-options", "passkey-login-finish"],
            true,
        ) &&
        !$uid
    ) {
        fail("Please sign in first.", 401);
    }
    limitAction("passkey", 40, 900);
    require_once __DIR__ . "/vendor/webauthn/src/WebAuthn.php";
    [$rp, $origin] = passkeyOrigin();
    $web = new \lbuchs\WebAuthn\WebAuthn("Axiomate Hub", $rp, ["none"], true);
    if ($action === "passkey-register-options") {
        requirePassword($uid, $input);
        if (
            (int) q("SELECT COUNT(*) FROM passkeys WHERE user_id=?", [
                $uid,
            ])->fetchColumn() >= 10
        ) {
            fail("You can save up to 10 passkeys.");
        }
        $user = q("SELECT * FROM users WHERE id=?", [$uid])->fetch();
        $ids = array_map(
            fn($r) => unb64($r["credential_id"]),
            q("SELECT credential_id FROM passkeys WHERE user_id=?", [
                $uid,
            ])->fetchAll(),
        );
        $options = $web->getCreateArgs(
            hash("sha256", "axiomate-member-" . $uid, true),
            $user["username"],
            $user["name"],
            120,
            "required",
            "required",
            null,
            $ids,
        );
        $_SESSION["webauthn"] = [
            "challenge" => b64u($web->getChallenge()->getBinaryString()),
            "type" => "register",
            "uid" => $uid,
            "time" => time(),
            "label" =>
                mb_substr(
                    trim((string) ($input["label"] ?? "My passkey")),
                    0,
                    40,
                ) ?:
                "My passkey",
        ];
        out($options);
    }
    if ($action === "passkey-login-options") {
        $options = $web->getGetArgs(
            [],
            120,
            true,
            true,
            true,
            true,
            true,
            "required",
        );
        $_SESSION["webauthn"] = [
            "challenge" => b64u($web->getChallenge()->getBinaryString()),
            "type" => "login",
            "uid" => 0,
            "time" => time(),
        ];
        out($options);
    }
    if (
        $action === "passkey-register-finish" ||
        $action === "passkey-login-finish"
    ) {
        $pending = $_SESSION["webauthn"] ?? null;
        unset($_SESSION["webauthn"]);
        $registration = $action === "passkey-register-finish";
        if (
            !$pending ||
            time() - $pending["time"] > 180 ||
            $pending["type"] !== ($registration ? "register" : "login") ||
            ($registration && $pending["uid"] !== $uid)
        ) {
            fail("Passkey request expired. Please start again.", 403);
        }
        $client = unb64((string) ($input["clientDataJSON"] ?? ""));
        $data = json_decode($client, true);
        if (
            !$data ||
            ($data["origin"] ?? "") !== $origin ||
            !empty($data["crossOrigin"])
        ) {
            fail("Passkey origin could not be verified.", 403);
        }
        try {
            if ($registration) {
                $credential = $web->processCreate(
                    $client,
                    unb64((string) ($input["attestationObject"] ?? "")),
                    unb64($pending["challenge"]),
                    true,
                    true,
                    false,
                );
                q(
                    "INSERT INTO passkeys(user_id,credential_id,public_key,counter,label) VALUES(?,?,?,?,?)",
                    [
                        $uid,
                        b64u($credential->credentialId),
                        $credential->credentialPublicKey,
                        $credential->signatureCounter ?? 0,
                        $pending["label"],
                    ],
                );
                out(["ok" => true]);
            }
            $id = b64u(unb64((string) ($input["id"] ?? "")));
            $key = q("SELECT * FROM passkeys WHERE credential_id=?", [
                $id,
            ])->fetch();
            if (!$key) {
                fail("This passkey is not registered with the Hub.", 401);
            }
            if (
                !hash_equals(
                    hash("sha256", "axiomate-member-" . $key["user_id"], true),
                    unb64((string) ($input["userHandle"] ?? "")),
                )
            ) {
                fail("Passkey account could not be verified.", 401);
            }
            $web->processGet(
                $client,
                unb64((string) ($input["authenticatorData"] ?? "")),
                unb64((string) ($input["signature"] ?? "")),
                $key["public_key"],
                unb64($pending["challenge"]),
                (int) $key["counter"],
                true,
                true,
            );
            q(
                "UPDATE passkeys SET counter=?,last_used=CURRENT_TIMESTAMP WHERE id=?",
                [$web->getSignatureCounter() ?? 0, $key["id"]],
            );
            session_regenerate_id(true);
            $_SESSION["uid"] = (int) $key["user_id"];
            $_SESSION["auth_version"] =
                (int) (q(
                    "SELECT auth_version FROM account_settings WHERE user_id=?",
                    [$key["user_id"]],
                )->fetchColumn() ?:
                1);
            $_SESSION["csrf"] = bin2hex(random_bytes(32));
            out(["ok" => true]);
        } catch (\lbuchs\WebAuthn\WebAuthnException $e) {
            fail("Passkey verification failed. Please try again.", 403);
        }
    }
    if ($action === "passkey-remove") {
        requirePassword($uid, $input);
        q("DELETE FROM passkeys WHERE id=? AND user_id=?", [
            (int) ($input["id"] ?? 0),
            $uid,
        ]);
        out(["ok" => true]);
    }
    fail("Not found.", 404);
}
if (
    in_array(
        $action,
        [
            "settings",
            "account-update",
            "password-update",
            "preferences",
            "notifications",
            "notifications-read",
            "export",
        ],
        true,
    )
) {
    if (!$uid) {
        fail("Please sign in first.", 401);
    }
    if (
        in_array(
            $action,
            [
                "account-update",
                "password-update",
                "preferences",
                "notifications-read",
            ],
            true,
        ) &&
        $_SERVER["REQUEST_METHOD"] !== "POST"
    ) {
        fail("Method not allowed.", 405);
    }
    if ($action === "settings") {
        out([
            "account" => array_merge(
                profileRecord(
                    q(
                        "SELECT id,username,email,name,bio,created_at FROM users WHERE id=?",
                        [$uid],
                    )->fetch(),
                ),
                emailStatus($uid),
            ),
            "preferences" => prefs($uid),
            "passkeys" => q(
                "SELECT id,label,created_at,last_used FROM passkeys WHERE user_id=? ORDER BY id DESC",
                [$uid],
            )->fetchAll(),
        ]);
    }
    if ($action === "account-update") {
        requirePassword($uid, $input);
        $email = strtolower(trim((string) ($input["email"] ?? "")));
        if (
            !filter_var($email, FILTER_VALIDATE_EMAIL) ||
            strlen($email) > 254
        ) {
            fail("Enter a valid email address.");
        }
        if (
            q("SELECT id FROM users WHERE email=? AND id!=?", [
                $email,
                $uid,
            ])->fetchColumn()
        ) {
            fail("This email is already registered.");
        }
        if (
            $email ===
                q("SELECT email FROM users WHERE id=?", [
                    $uid,
                ])->fetchColumn() &&
            emailStatus($uid)["email_verified"]
        ) {
            out(["ok" => true, "unchanged" => true]);
        }
        if (!sendVerification($uid, $email)) {
            fail(
                "We could not send the verification email. Your current address has not changed. Please try again later.",
                503,
            );
        }
        out(["ok" => true, "pending_verification" => true]);
    }
    if ($action === "password-update") {
        requirePassword($uid, $input);
        $password = (string) ($input["new_password"] ?? "");
        if (strlen($password) < 12 || strlen($password) > 72) {
            fail("Use a password between 12 and 72 characters.");
        }
        $db->beginTransaction();
        q("UPDATE users SET password=? WHERE id=?", [
            password_hash($password, PASSWORD_DEFAULT),
            $uid,
        ]);
        q(
            "INSERT INTO account_settings(user_id) VALUES(?) ON CONFLICT DO NOTHING",
            [$uid],
        );
        q(
            "UPDATE account_settings SET auth_version=auth_version+1 WHERE user_id=?",
            [$uid],
        );
        $version = (int) q(
            "SELECT auth_version FROM account_settings WHERE user_id=?",
            [$uid],
        )->fetchColumn();
        $db->commit();
        session_regenerate_id(true);
        $_SESSION["auth_version"] = $version;
        out(["ok" => true]);
    }
    if ($action === "preferences") {
        $theme = (string) ($input["theme"] ?? "midnight");
        $density = (string) ($input["density"] ?? "comfortable");
        if (
            !in_array($theme, ["midnight", "amethyst"], true) ||
            !in_array($density, ["comfortable", "compact"], true)
        ) {
            fail("Invalid appearance preference.");
        }
        $preferences = [
            "theme" => $theme,
            "density" => $density,
            "reduced_motion" => !empty($input["reduced_motion"]),
        ];
        q(
            "INSERT INTO account_settings(user_id,preferences) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET preferences=excluded.preferences",
            [$uid, json_encode($preferences)],
        );
        out(["ok" => true, "preferences" => $preferences]);
    }
    if ($action === "notifications") {
        out([
            "unread" => (int) q(
                "SELECT COUNT(*) FROM notifications WHERE user_id=? AND is_read=0",
                [$uid],
            )->fetchColumn(),
            "items" => array_map(
                fn($n) => profileRecord($n, (int) $n["actor_id"]),
                q(
                    "SELECT n.*,u.name,u.username,p.body FROM notifications n JOIN users u ON u.id=n.actor_id LEFT JOIN posts p ON p.id=n.post_id WHERE n.user_id=? ORDER BY n.id DESC LIMIT 50",
                    [$uid],
                )->fetchAll(),
            ),
        ]);
    }
    if ($action === "notifications-read") {
        q("UPDATE notifications SET is_read=1 WHERE user_id=?", [$uid]);
        out(["ok" => true]);
    }
    if ($action === "export") {
        out([
            "account" => array_merge(
                profileRecord(
                    q(
                        "SELECT id,username,email,name,bio,created_at FROM users WHERE id=?",
                        [$uid],
                    )->fetch(),
                ),
                emailStatus($uid),
            ),
            "posts" => array_map(
                "videoRecord",
                q(
                    "SELECT id,body,parent_id,created_at FROM posts WHERE user_id=? ORDER BY id",
                    [$uid],
                )->fetchAll(),
            ),
            "preferences" => prefs($uid),
        ]);
    }
}
