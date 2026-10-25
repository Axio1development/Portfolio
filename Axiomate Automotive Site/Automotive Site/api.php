<?php
declare(strict_types=1);
require __DIR__ . "/academy.php";
ini_set("display_errors", "0");
header("Content-Type: application/json; charset=utf-8");
header("Cache-Control: no-store");
header("X-Content-Type-Options: nosniff");
session_name("axiomate_session");
session_set_cookie_params([
    "httponly" => true,
    "secure" => !empty($_SERVER["HTTPS"]) && $_SERVER["HTTPS"] !== "off",
    "samesite" => "Lax",
    "path" => "/",
]);
ini_set("session.use_strict_mode", "1");
session_start();
function reply(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
    exit();
}
try {
    $_SESSION["csrf"] ??= bin2hex(random_bytes(32));
    $action = $_GET["action"] ?? "session";
    if ($_SERVER["REQUEST_METHOD"] === "GET") {
        database();
        $u = user();
        if ($action === "session") {
            reply(["csrf" => $_SESSION["csrf"]] + sessionState($u));
        }
        if ($action === "owner") {
            if (!$u || $u["role"] !== "owner") {
                reply(["error" => "Owner access is required."], 403);
            }
            $users = [];
            foreach (query("SELECT id FROM users ORDER BY id DESC") as $r) {
                $users[] = userById((int) $r["id"]);
            }
            reply([
                "users" => $users,
                "classes" => query(
                    "SELECT c.*,u.name AS teacher_name FROM classes c JOIN users u ON u.id=c.teacher_id ORDER BY c.id DESC",
                )->fetchAll(),
                "grades" => query(
                    "SELECT g.*,u.name AS student_name FROM grades g JOIN users u ON u.id=g.user_id ORDER BY completed_at DESC",
                )->fetchAll(),
                "notifications" => query(
                    "SELECT n.*,u.email AS teacher_email FROM grade_notifications n JOIN users u ON u.id=n.teacher_id ORDER BY n.id DESC",
                )->fetchAll(),
                "courses" => publicCourses($u),
            ]);
        }
        reply(["error" => "Unknown endpoint"], 404);
    }
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        reply(["error" => "Method not allowed"], 405);
    }
    if ((int) ($_SERVER["CONTENT_LENGTH"] ?? 0) > 180000) {
        reply(["error" => "Request too large"], 413);
    }
    $input = json_decode(file_get_contents("php://input"), true);
    if (!is_array($input)) {
        reply(["error" => "Invalid request"], 400);
    }
    if (!hash_equals($_SESSION["csrf"], $_SERVER["HTTP_X_CSRF_TOKEN"] ?? "")) {
        reply(["error" => "Your session expired. Refresh and try again."], 403);
    }
    if (in_array($action, ["login", "register"], true)) {
        $email = strtolower(
            trim(is_string($input["email"] ?? null) ? $input["email"] : ""),
        );
        $password = $input["password"] ?? null;
        if (
            !filter_var($email, FILTER_VALIDATE_EMAIL) ||
            strlen($email) > 254
        ) {
            reply(["error" => "Enter a valid email address."], 422);
        }
        if (!is_string($password) || strlen($password) > 256) {
            reply(["error" => "Enter a valid password."], 422);
        }
        throttle("auth:" . $email);
        if ($action === "register") {
            $name = validateText($input["name"] ?? null, "Your name", 2, 80);
            if (strlen($password) < 10) {
                reply(
                    [
                        "error" =>
                            "Choose a password with at least 10 characters.",
                    ],
                    422,
                );
            }
            $role = $input["role"] ?? "student";
            if (!in_array($role, ["student", "teacher"], true)) {
                reply(["error" => "Choose student or teacher."], 422);
            }
            $profile = ["", "", "", "", ""];
            if ($role === "teacher") {
                $profile = [
                    validateText(
                        $input["school"] ?? null,
                        "School name",
                        3,
                        160,
                    ),
                    validateText(
                        $input["location"] ?? null,
                        "School city / region",
                        2,
                        160,
                    ),
                    validateText(
                        $input["department"] ?? null,
                        "Department / program",
                        2,
                        120,
                    ),
                    validateText(
                        $input["job_title"] ?? null,
                        "Teaching role",
                        2,
                        100,
                    ),
                    trim(
                        is_string($input["school_website"] ?? null)
                            ? $input["school_website"]
                            : "",
                    ),
                ];
                if (
                    $profile[4] !== "" &&
                    (!filter_var($profile[4], FILTER_VALIDATE_URL) ||
                        !str_starts_with($profile[4], "https://") ||
                        strlen($profile[4]) > 250)
                ) {
                    reply(
                        [
                            "error" =>
                                "School website must be a valid https:// URL.",
                        ],
                        422,
                    );
                }
                if (($input["school_confirm"] ?? "") !== "yes") {
                    reply(
                        [
                            "error" =>
                                "Confirm you are authorized to teach at this school.",
                        ],
                        422,
                    );
                }
            }
            $db = database();
            $db->beginTransaction();
            try {
                query("INSERT INTO users(name,email,password) VALUES(?,?,?)", [
                    $name,
                    $email,
                    password_hash($password, PASSWORD_DEFAULT),
                ]);
                $id = (int) $db->lastInsertId();
                query(
                    "INSERT INTO profiles(user_id,role,school,location,department,job_title,school_website) VALUES(?,?,?,?,?,?,?)",
                    [$id, $role, ...$profile],
                );
                $db->commit();
                $_SESSION["uid"] = $id;
            } catch (PDOException $e) {
                $db->rollBack();
                if ($e->getCode() === "23000") {
                    reply(
                        [
                            "error" =>
                                "An account already uses that email. Try signing in.",
                        ],
                        409,
                    );
                }
                throw $e;
            }
        } else {
            $row = query("SELECT id,password FROM users WHERE email=?", [
                $email,
            ])->fetch();
            $hash =
                $row["password"] ??
                '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
            if (!password_verify($password, $hash) || !$row) {
                reply(["error" => "Email or password is incorrect."], 401);
            }
            $_SESSION["uid"] = (int) $row["id"];
        }
        session_regenerate_id(true);
        $_SESSION["csrf"] = bin2hex(random_bytes(32));
        reply(["csrf" => $_SESSION["csrf"]] + sessionState(user()));
    }
    if ($action === "logout") {
        $_SESSION = [];
        session_regenerate_id(true);
        $_SESSION["csrf"] = bin2hex(random_bytes(32));
        reply(["csrf" => $_SESSION["csrf"]] + sessionState(null));
    }
    $u = user();
    if (!$u) {
        reply(["error" => "Sign in to continue."], 401);
    }
    if ($action === "answer") {
        $c = findCourse(
            is_string($input["course"] ?? null) ? $input["course"] : "",
            $u,
        );
        $a = $input["activity"] ?? null;
        if (!$c || !is_int($a) || $a < 0 || $a >= count($c["lessons"])) {
            reply(["error" => "Unknown lesson or course access denied."], 422);
        }
        if (levelLocked($c, $u)) {
            reply(
                ["error" => "Finish the previous level of this course first."],
                403,
            );
        }
        $l = $c["lessons"][$a];
        $choice = $input["choice"] ?? null;
        if ($l["type"] === "identify") {
            if (
                !is_string($choice) ||
                !array_key_exists($choice, $l["parts"])
            ) {
                reply(["error" => "Choose a valid component."], 422);
            }
        } elseif (
            !is_int($choice) ||
            !array_key_exists($choice, $l["options"])
        ) {
            reply(["error" => "Choose a valid answer."], 422);
        }
        $db = database();
        $db->beginTransaction();
        try {
            $correct = $choice === $l["answer"];
            query(
                "INSERT OR IGNORE INTO attempts(user_id,course_id,activity,choice,correct,explanation) VALUES(?,?,?,?,?,?)",
                [
                    $u["id"],
                    $c["id"],
                    $a,
                    json_encode($choice),
                    (int) $correct,
                    $l["explanation"],
                ],
            );
            query(
                "INSERT OR IGNORE INTO progress(user_id,course_id,activity) VALUES(?,?,?)",
                [$u["id"], $c["id"], $a],
            );
            $record = query(
                "SELECT correct,explanation FROM attempts WHERE user_id=? AND course_id=? AND activity=?",
                [$u["id"], $c["id"], $a],
            )->fetch();
            $score = query(
                "SELECT COUNT(*) AS total,SUM(correct) AS correct FROM attempts WHERE user_id=? AND course_id=?",
                [$u["id"], $c["id"]],
            )->fetch();
            if ((int) $score["total"] === count($c["lessons"])) {
                $pct = (int) round(
                    (100 * (int) $score["correct"]) / (int) $score["total"],
                );
                $letter =
                    $pct >= 90
                        ? "A"
                        : ($pct >= 80
                            ? "B"
                            : ($pct >= 70
                                ? "C"
                                : ($pct >= 60
                                    ? "D"
                                    : "F")));
                query(
                    "INSERT OR IGNORE INTO grades(user_id,course_id,correct,total,percentage,letter) VALUES(?,?,?,?,?,?)",
                    [
                        $u["id"],
                        $c["id"],
                        $score["correct"],
                        $score["total"],
                        $pct,
                        $letter,
                    ],
                );
                if ($u["role"] === "student") {
                    queueGradeNotifications((int) $u["id"], $c["id"]);
                }
            }
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }
        sendGradeEmails();
        reply(
            [
                "correct" => (bool) $record["correct"],
                "explanation" => $record["explanation"],
            ] + learningState((int) $u["id"]),
        );
    }
    if ($action === "join_class") {
        if ($u["role"] !== "student") {
            reply(["error" => "Only student accounts can join classes."], 403);
        }
        throttle("join:" . $u["id"], 40);
        $code = strtoupper(
            validateText($input["code"] ?? null, "Class code", 8, 8),
        );
        $class = query("SELECT id FROM classes WHERE code=?", [$code])->fetch();
        if (!$class) {
            reply(
                [
                    "error" =>
                        "No class matches that code. Ask your teacher to check it.",
                ],
                404,
            );
        }
        query(
            "INSERT OR IGNORE INTO memberships(class_id,student_id) VALUES(?,?)",
            [$class["id"], $u["id"]],
        );
        foreach (
            query("SELECT course_id FROM assignments WHERE class_id=?", [
                $class["id"],
            ])
            as $a
        ) {
            queueGradeNotifications((int) $u["id"], $a["course_id"]);
        }
        sendGradeEmails();
        reply(sessionState($u));
    }
    if ($action === "profile") {
        if (isTeacher($u)) {
            query("UPDATE profiles SET email_notifications=? WHERE user_id=?", [
                (int) (($input["email_notifications"] ?? false) === true),
                $u["id"],
            ]);
        }
        reply(sessionState(user()));
    }
    if (!isTeacher($u)) {
        reply(["error" => "Teacher access is required."], 403);
    }
    if ($action === "create_class") {
        if (
            (int) query("SELECT COUNT(*) FROM classes WHERE teacher_id=?", [
                $u["id"],
            ])->fetchColumn() >= 100
        ) {
            reply(
                ["error" => "The account class limit has been reached."],
                422,
            );
        }
        $name = validateText($input["name"] ?? null, "Class name", 3, 120);
        $code = strtoupper(bin2hex(random_bytes(4)));
        query("INSERT INTO classes(teacher_id,name,code) VALUES(?,?,?)", [
            $u["id"],
            $name,
            $code,
        ]);
        reply(sessionState($u));
    }
    if ($action === "assign") {
        $id = $input["class_id"] ?? null;
        if (
            !is_int($id) ||
            !query("SELECT id FROM classes WHERE id=? AND teacher_id=?", [
                $id,
                $u["id"],
            ])->fetch()
        ) {
            reply(
                ["error" => "You can only assign courses to your own classes."],
                403,
            );
        }
        $course = findCourse(
            is_string($input["course"] ?? null) ? $input["course"] : "",
            $u,
        );
        if (!$course) {
            reply(["error" => "Course not found."], 404);
        }
        if (
            isset($course["teacher_id"]) &&
            (int) $course["teacher_id"] !== (int) $u["id"]
        ) {
            reply(
                ["error" => "Assign your own courses or an Axiomate course."],
                403,
            );
        }
        query(
            "INSERT OR IGNORE INTO assignments(class_id,course_id) VALUES(?,?)",
            [$id, $course["id"]],
        );
        foreach (
            query("SELECT student_id FROM memberships WHERE class_id=?", [$id])
            as $s
        ) {
            queueGradeNotifications((int) $s["student_id"], $course["id"]);
        }
        sendGradeEmails((int) $u["id"]);
        reply(sessionState($u));
    }
    if ($action === "create_course") {
        if (
            (int) query(
                "SELECT COUNT(*) FROM custom_courses WHERE teacher_id=?",
                [$u["id"]],
            )->fetchColumn() >= 100
        ) {
            reply(
                ["error" => "The account course limit has been reached."],
                422,
            );
        }
        $c = customCourse($input, $u);
        query(
            "INSERT INTO custom_courses(id,teacher_id,title,payload) VALUES(?,?,?,?)",
            [
                $c["id"],
                $u["id"],
                $c["title"],
                json_encode($c, JSON_THROW_ON_ERROR),
            ],
        );
        reply(["created_course_id" => $c["id"]] + sessionState($u));
    }
    if ($action === "send_notifications") {
        sendGradeEmails((int) $u["id"]);
        reply(sessionState($u));
    }
    reply(["error" => "Unknown action"], 404);
} catch (Throwable $e) {
    error_log("Axiomate API: " . $e->getMessage());
    reply(
        [
            "error" =>
                "The learning service is temporarily unavailable. Please try again shortly.",
        ],
        503,
    );
}
