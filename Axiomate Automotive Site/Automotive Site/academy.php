<?php
declare(strict_types=1);
require_once __DIR__ . "/content.php";
const OWNER_ACCOUNT_ID = "AX-000001";
function dataDirectory(): string
{
    return getenv("AXIOMATE_DATA_DIR") ?:
        dirname(__DIR__) . "/axiomate-private";
}
function database(): PDO
{
    static $db;
    if ($db) {
        return $db;
    }
    $directory = dataDirectory();
    if (!is_dir($directory) && !mkdir($directory, 0700, true)) {
        throw new RuntimeException("Storage unavailable");
    }
    $db = new PDO("sqlite:" . $directory . "/academy.sqlite", null, null, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);
    $db->exec("PRAGMA busy_timeout=5000");
    $db->exec("PRAGMA foreign_keys=ON");
    if ((int) $db->query("PRAGMA user_version")->fetchColumn() < 2) {
        $db->beginTransaction();
        try {
            $schemas = [
                "CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
                "CREATE TABLE IF NOT EXISTS progress (user_id INTEGER NOT NULL, course_id TEXT NOT NULL, activity INTEGER NOT NULL, completed_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,course_id,activity), FOREIGN KEY(user_id) REFERENCES users(id))",
                "CREATE TABLE IF NOT EXISTS auth_limits (key TEXT PRIMARY KEY, attempts INTEGER NOT NULL, start INTEGER NOT NULL)",
                "CREATE TABLE IF NOT EXISTS profiles (user_id INTEGER PRIMARY KEY REFERENCES users(id), role TEXT NOT NULL DEFAULT 'student', school TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', department TEXT NOT NULL DEFAULT '', job_title TEXT NOT NULL DEFAULT '', school_website TEXT NOT NULL DEFAULT '', email_notifications INTEGER NOT NULL DEFAULT 1)",
                "CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)",
                "CREATE TABLE IF NOT EXISTS classes (id INTEGER PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES users(id), name TEXT NOT NULL, code TEXT UNIQUE NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
                "CREATE TABLE IF NOT EXISTS memberships (class_id INTEGER NOT NULL REFERENCES classes(id), student_id INTEGER NOT NULL REFERENCES users(id), joined_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(class_id,student_id))",
                "CREATE TABLE IF NOT EXISTS custom_courses (id TEXT PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES users(id), title TEXT NOT NULL, payload TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)",
                "CREATE TABLE IF NOT EXISTS assignments (class_id INTEGER NOT NULL REFERENCES classes(id), course_id TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(class_id,course_id))",
                "CREATE TABLE IF NOT EXISTS attempts (user_id INTEGER NOT NULL REFERENCES users(id), course_id TEXT NOT NULL, activity INTEGER NOT NULL, choice TEXT NOT NULL, correct INTEGER NOT NULL, explanation TEXT NOT NULL, submitted_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,course_id,activity))",
                "CREATE TABLE IF NOT EXISTS grades (user_id INTEGER NOT NULL REFERENCES users(id), course_id TEXT NOT NULL, correct INTEGER NOT NULL, total INTEGER NOT NULL, percentage INTEGER NOT NULL, letter TEXT NOT NULL, completed_at TEXT DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id,course_id))",
                "CREATE TABLE IF NOT EXISTS grade_notifications (id INTEGER PRIMARY KEY, teacher_id INTEGER NOT NULL REFERENCES users(id), student_id INTEGER NOT NULL REFERENCES users(id), class_id INTEGER NOT NULL REFERENCES classes(id), course_id TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'queued', attempts INTEGER NOT NULL DEFAULT 0, last_attempt INTEGER NOT NULL DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(class_id,student_id,course_id))",
                "CREATE INDEX IF NOT EXISTS memberships_student ON memberships(student_id)",
                "CREATE INDEX IF NOT EXISTS classes_teacher ON classes(teacher_id)",
                "CREATE INDEX IF NOT EXISTS notifications_teacher ON grade_notifications(teacher_id)",
            ];
            foreach ($schemas as $sql) {
                $db->exec($sql);
            }
            $db->exec(
                "INSERT OR IGNORE INTO profiles(user_id) SELECT id FROM users",
            );
            $db->exec("PRAGMA user_version=2");
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }
    if ((int) $db->query("PRAGMA user_version")->fetchColumn() < 3) {
        $db->beginTransaction();
        try {
            $db->exec(
                "DELETE FROM attempts WHERE course_id NOT LIKE 'teacher-%'",
            );
            $db->exec(
                "DELETE FROM progress WHERE course_id NOT LIKE 'teacher-%'",
            );
            $db->exec("PRAGMA user_version=3");
            $db->commit();
        } catch (Throwable $e) {
            $db->rollBack();
            throw $e;
        }
    }
    return $db;
}
function query(string $sql, array $params = []): PDOStatement
{
    $s = database()->prepare($sql);
    $s->execute($params);
    return $s;
}
function userById(int $id): ?array
{
    $u = query(
        "SELECT u.id,u.name,u.email,u.created_at,p.role,p.school,p.location,p.department,p.job_title,p.school_website,p.email_notifications FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=?",
        [$id],
    )->fetch();
    if (!$u) {
        return null;
    }
    $owner = (int) preg_replace(
        "/^AX-/i",
        "",
        getenv("AXIOMATE_OWNER_ID") ?: OWNER_ACCOUNT_ID,
    );
    if ($id === $owner) {
        $u["role"] = "owner";
    }
    $u["account_id"] = "AX-" . str_pad((string) $u["id"], 6, "0", STR_PAD_LEFT);
    return $u;
}
function user(): ?array
{
    return !empty($_SESSION["uid"]) ? userById((int) $_SESSION["uid"]) : null;
}
function isTeacher(array $u): bool
{
    return in_array($u["role"], ["teacher", "owner"], true);
}
function availableCourses(?array $u): array
{
    $result = courses();
    if (!$u) {
        return $result;
    }
    $sql =
        $u["role"] === "owner"
            ? "SELECT c.payload,u.name AS author FROM custom_courses c JOIN users u ON u.id=c.teacher_id"
            : "SELECT c.payload,u.name AS author FROM custom_courses c JOIN users u ON u.id=c.teacher_id WHERE c.teacher_id=? OR EXISTS(SELECT 1 FROM assignments a JOIN memberships m ON m.class_id=a.class_id WHERE a.course_id=c.id AND m.student_id=?)";
    foreach (
        query($sql, $u["role"] === "owner" ? [] : [$u["id"], $u["id"]])
        as $row
    ) {
        $c = json_decode($row["payload"], true, 512, JSON_THROW_ON_ERROR);
        $c["author"] = $row["author"];
        $result[] = $c;
    }
    return $result;
}
function findCourse(string $id, ?array $u): ?array
{
    foreach (availableCourses($u) as $c) {
        if ($c["id"] === $id) {
            return $c;
        }
    }
    return null;
}
function publicCourses(?array $u): array
{
    $result = availableCourses($u);
    foreach ($result as &$c) {
        foreach ($c["lessons"] as &$lesson) {
            unset($lesson["answer"], $lesson["explanation"]);
        }
        unset($lesson);
    }
    unset($c);
    return $result;
}
function learningState(int $id): array
{
    $progress = [];
    foreach (
        query("SELECT course_id,activity FROM progress WHERE user_id=?", [$id])
        as $r
    ) {
        $progress[$r["course_id"]][] = (int) $r["activity"];
    }
    $attempts = [];
    foreach (
        query(
            "SELECT course_id,activity,choice,correct,explanation,submitted_at FROM attempts WHERE user_id=?",
            [$id],
        )
        as $r
    ) {
        $r["correct"] = (bool) $r["correct"];
        $r["choice"] = json_decode($r["choice"], true);
        $attempts[$r["course_id"]][(int) $r["activity"]] = $r;
    }
    $grades = [];
    foreach (
        query(
            "SELECT course_id,correct,total,percentage,letter,completed_at FROM grades WHERE user_id=?",
            [$id],
        )
        as $r
    ) {
        $grades[$r["course_id"]] = $r;
    }
    return [
        "progress" => (object) $progress,
        "attempts" => (object) $attempts,
        "grades" => (object) $grades,
    ];
}
function classroomState(array $u): array
{
    if (isTeacher($u)) {
        $classes = query(
            "SELECT c.*,(SELECT COUNT(*) FROM memberships m WHERE m.class_id=c.id) AS student_count FROM classes c WHERE teacher_id=? ORDER BY c.id DESC",
            [$u["id"]],
        )->fetchAll();
        foreach ($classes as &$c) {
            $c["assignments"] = query(
                "SELECT course_id,created_at FROM assignments WHERE class_id=?",
                [$c["id"]],
            )->fetchAll();
            $c["students"] = query(
                "SELECT u.id,u.name,u.email FROM memberships m JOIN users u ON u.id=m.student_id WHERE m.class_id=? ORDER BY u.name",
                [$c["id"]],
            )->fetchAll();
        }
        unset($c);
        $gradebook = query(
            "SELECT c.id AS class_id,c.name AS class_name,u.id AS student_id,u.name AS student_name,u.email AS student_email,a.course_id,g.percentage,g.letter,g.correct,g.total,g.completed_at,(SELECT COUNT(*) FROM attempts t WHERE t.user_id=u.id AND t.course_id=a.course_id) AS submitted_lessons,COALESCE(n.status,'not_queued') AS email_status FROM classes c JOIN memberships m ON m.class_id=c.id JOIN users u ON u.id=m.student_id JOIN assignments a ON a.class_id=c.id LEFT JOIN grades g ON g.user_id=u.id AND g.course_id=a.course_id LEFT JOIN grade_notifications n ON n.class_id=c.id AND n.student_id=u.id AND n.course_id=a.course_id WHERE c.teacher_id=? ORDER BY g.completed_at DESC,u.name",
            [$u["id"]],
        )->fetchAll();
        return ["classes" => $classes, "gradebook" => $gradebook];
    }
    $classes = query(
        "SELECT c.id,c.name,u.name AS teacher_name,p.school FROM memberships m JOIN classes c ON c.id=m.class_id JOIN users u ON u.id=c.teacher_id JOIN profiles p ON p.user_id=u.id WHERE m.student_id=? ORDER BY c.id DESC",
        [$u["id"]],
    )->fetchAll();
    foreach ($classes as &$c) {
        $c["assignments"] = query(
            "SELECT course_id FROM assignments WHERE class_id=?",
            [$c["id"]],
        )->fetchAll();
    }
    unset($c);
    return ["classes" => $classes, "gradebook" => []];
}
function sessionState(?array $u): array
{
    return ["user" => $u, "courses" => publicCourses($u)] +
        ($u
            ? learningState((int) $u["id"]) + classroomState($u)
            : [
                "progress" => (object) [],
                "attempts" => (object) [],
                "grades" => (object) [],
                "classes" => [],
                "gradebook" => [],
            ]);
}
function throttle(string $identity, int $limit = 20): void
{
    $now = time();
    foreach (
        [
            hash("sha256", "ip:" . ($_SERVER["REMOTE_ADDR"] ?? "unknown")),
            hash("sha256", $identity),
        ]
        as $key
    ) {
        query(
            "INSERT INTO auth_limits(key,attempts,start) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN start < ? THEN 1 ELSE attempts+1 END,start=CASE WHEN start < ? THEN excluded.start ELSE start END",
            [$key, $now, $now - 900, $now - 900],
        );
        if (
            (int) query("SELECT attempts FROM auth_limits WHERE key=?", [
                $key,
            ])->fetchColumn() > $limit
        ) {
            reply(
                [
                    "error" =>
                        "Too many attempts. Please try again in 15 minutes.",
                ],
                429,
            );
        }
    }
    query("DELETE FROM auth_limits WHERE start < ?", [$now - 86400]);
}
function queueGradeNotifications(int $studentId, string $courseId): void
{
    query(
        "INSERT OR IGNORE INTO grade_notifications(teacher_id,student_id,class_id,course_id,status) SELECT c.teacher_id,m.student_id,c.id,a.course_id,CASE WHEN p.email_notifications=1 THEN 'queued' ELSE 'disabled' END FROM memberships m JOIN classes c ON c.id=m.class_id JOIN profiles p ON p.user_id=c.teacher_id JOIN assignments a ON a.class_id=c.id WHERE m.student_id=? AND a.course_id=? AND EXISTS(SELECT 1 FROM grades g WHERE g.user_id=m.student_id AND g.course_id=a.course_id)",
        [$studentId, $courseId],
    );
}
function sendGradeEmails(?int $teacherId = null): void
{
    $rows = query(
        "SELECT id FROM grade_notifications WHERE status IN ('queued','failed') AND attempts<3 AND last_attempt<?" .
            ($teacherId === null ? "" : " AND teacher_id=?") .
            " ORDER BY id LIMIT 3",
        $teacherId === null ? [time() - 60] : [time() - 60, $teacherId],
    )->fetchAll();
    foreach ($rows as $row) {
        $claim = query(
            "UPDATE grade_notifications SET status='sending',attempts=attempts+1,last_attempt=? WHERE id=? AND status IN ('queued','failed') AND attempts<3 AND last_attempt<?",
            [time(), $row["id"], time() - 60],
        );
        if (!$claim->rowCount()) {
            continue;
        }
        $n = query(
            "SELECT n.*,t.email AS teacher_email,s.name AS student_name,c.name AS class_name,g.percentage,g.letter,g.correct,g.total FROM grade_notifications n JOIN users t ON t.id=n.teacher_id JOIN users s ON s.id=n.student_id JOIN classes c ON c.id=n.class_id JOIN grades g ON g.user_id=n.student_id AND g.course_id=n.course_id WHERE n.id=?",
            [$row["id"]],
        )->fetch();
        $teacher = userById((int) $n["teacher_id"]);
        $course = findCourse($n["course_id"], $teacher);
        $title = $course["title"] ?? $n["course_id"];
        $body =
            "Axiomate Automotive Academy\n\nA student has completed an assigned course.\n\nStudent: " .
            $n["student_name"] .
            "\nClass: " .
            $n["class_name"] .
            "\nCourse: " .
            $title .
            "\nGrade: " .
            $n["percentage"] .
            "% (" .
            $n["letter"] .
            ")\nScore: " .
            $n["correct"] .
            " / " .
            $n["total"] .
            "\n\nGrades use the first submitted answer for each lesson.\nView your teacher dashboard: https://axiomateauto.com/#teaching\n\nYou receive these notifications for courses assigned in your class. Manage notifications under Account.\n";
        try {
            $sent =
                getenv("AXIOMATE_MAIL_MODE") === "test"
                    ? true
                    : function_exists("mail") &&
                        @mail(
                            $n["teacher_email"],
                            "Axiomate: a course grade is ready",
                            $body,
                            [
                                "From" =>
                                    "Axiomate Academy <noreply@axiomateauto.com>",
                                "MIME-Version" => "1.0",
                                "Content-Type" => "text/plain; charset=UTF-8",
                            ],
                            "-fnoreply@axiomateauto.com",
                        );
        } catch (Throwable $e) {
            $sent = false;
        }
        query("UPDATE grade_notifications SET status=? WHERE id=?", [
            $sent ? "accepted" : "failed",
            $n["id"],
        ]);
    }
}
function validateText(mixed $value, string $label, int $min, int $max): string
{
    if (!is_string($value)) {
        reply(["error" => $label . " is required."], 422);
    }
    $s = trim($value);
    if (strlen($s) < $min || strlen($s) > $max) {
        reply(
            [
                "error" =>
                    $label .
                    " must be between " .
                    $min .
                    " and " .
                    $max .
                    " characters.",
            ],
            422,
        );
    }
    return $s;
}
function customCourse(array $input, array $u): array
{
    $title = validateText($input["title"] ?? null, "Course title", 3, 120);
    $level = $input["level"] ?? "";
    if (!in_array($level, ["Beginner", "Intermediate", "Advanced"], true)) {
        reply(["error" => "Choose a course level."], 422);
    }
    $description = validateText(
        $input["description"] ?? null,
        "Description",
        10,
        500,
    );
    $category = validateText($input["category"] ?? null, "Category", 2, 60);
    $raw = $input["lessons"] ?? null;
    if (
        !is_array($raw) ||
        !array_is_list($raw) ||
        count($raw) < 1 ||
        count($raw) > 20
    ) {
        reply(["error" => "Include between 1 and 20 lessons."], 422);
    }
    $lessons = [];
    foreach ($raw as $l) {
        if (!is_array($l)) {
            reply(["error" => "Invalid lesson"], 422);
        }
        $options = $l["options"] ?? null;
        $answer = $l["answer"] ?? null;
        if (
            !is_array($options) ||
            !array_is_list($options) ||
            count($options) !== 3 ||
            !is_int($answer) ||
            $answer < 0 ||
            $answer > 2
        ) {
            reply(
                [
                    "error" =>
                        "Each lesson needs three answers and one correct answer.",
                ],
                422,
            );
        }
        $options = array_map(
            fn($v) => validateText($v, "Answer option", 1, 300),
            $options,
        );
        if (count(array_unique($options)) !== 3) {
            reply(["error" => "Answer choices must be different."], 422);
        }
        $diagram = $l["diagram"] ?? null;
        if (
            !in_array(
                $diagram,
                [null, "engine", "electrical", "brakes", "cooling"],
                true,
            )
        ) {
            reply(["error" => "Invalid teaching diagram."], 422);
        }
        $lessons[] = [
            "title" => validateText(
                $l["title"] ?? null,
                "Lesson title",
                3,
                120,
            ),
            "reading" => validateText(
                $l["reading"] ?? null,
                "Lesson content",
                20,
                6000,
            ),
            "type" => "quiz",
            "diagram" => $diagram,
            "prompt" => validateText($l["prompt"] ?? null, "Question", 5, 500),
            "options" => $options,
            "answer" => $answer,
            "explanation" => validateText(
                $l["explanation"] ?? null,
                "Answer explanation",
                10,
                1500,
            ),
        ];
    }
    return [
        "id" => "teacher-" . bin2hex(random_bytes(12)),
        "title" => $title,
        "category" => $category,
        "level" => $level,
        "minutes" => count($lessons) * 7,
        "description" => $description,
        "color" => "blue",
        "visual" => "concept",
        "nodes" => ["Explore", "Understand", "Assess"],
        "lessons" => $lessons,
        "lesson_count" => count($lessons),
        "author" => $u["name"],
        "teacher_id" => $u["id"],
    ];
}
function levelLocked(array $c, array $u): bool
{
    if (empty($c["topic"]) || isTeacher($u) || $c["level"] === "Beginner") {
        return false;
    }
    if (
        query(
            "SELECT 1 FROM assignments a JOIN memberships m ON m.class_id=a.class_id WHERE a.course_id=? AND m.student_id=?",
            [$c["id"], $u["id"]],
        )->fetch()
    ) {
        return false;
    }
    $base = preg_replace('/-(intermediate|advanced)$/', "", $c["id"]);
    foreach (["Beginner", "Intermediate"] as $level) {
        if ($level === $c["level"]) {
            break;
        }
        if (
            !query("SELECT 1 FROM grades WHERE user_id=? AND course_id=?", [
                $u["id"],
                $base . "-" . strtolower($level),
            ])->fetch()
        ) {
            return true;
        }
    }
    return false;
}
