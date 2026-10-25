<?php
if (!isset($db, $action, $uid)) {
    http_response_code(404);
    exit();
}
$db->exec(
    "CREATE TABLE IF NOT EXISTS post_videos(post_id INTEGER PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,user_id INTEGER REFERENCES users(id),filename TEXT UNIQUE,mime TEXT,bytes INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP); CREATE INDEX IF NOT EXISTS post_videos_user ON post_videos(user_id);",
);
function videoRecord(array $record): array
{
    $video = q("SELECT mime,bytes FROM post_videos WHERE post_id=?", [
        $record["id"],
    ])->fetch();
    $record["video"] = $video
        ? [
            "url" => "api.php?action=video&id=" . (int) $record["id"],
            "mime" => $video["mime"],
            "bytes" => (int) $video["bytes"],
        ]
        : null;
    return $record;
}
function deletePostWithMedia(int $id, int $uid): void
{
    global $db, $dir;
    $db->beginTransaction();
    if (
        !q("SELECT id FROM posts WHERE id=? AND user_id=?", [
            $id,
            $uid,
        ])->fetch()
    ) {
        $db->rollBack();
        return;
    }
    $files = q(
        "WITH RECURSIVE thread(id) AS (SELECT id FROM posts WHERE id=? UNION ALL SELECT p.id FROM posts p JOIN thread t ON p.parent_id=t.id) SELECT filename FROM post_videos WHERE post_id IN (SELECT id FROM thread)",
        [$id],
    )->fetchAll();
    q("DELETE FROM posts WHERE id=? AND user_id=?", [$id, $uid]);
    $db->commit();
    foreach ($files as $file) {
        if (preg_match('/^[a-f0-9]{48}\.(mp4|webm)$/D', $file["filename"])) {
            if (!@unlink($dir . "/videos/" . $file["filename"])) {
                error_log("Axiomate: video cleanup failed.");
            }
        }
    }
}
if ($action === "video-post") {
    if (!$uid) {
        fail("Please sign in to upload a video.", 401);
    }
    if ($_SERVER["REQUEST_METHOD"] !== "POST") {
        fail("Method not allowed.", 405);
    }
    limitAction("video-post-" . $uid, 10, 3600);
    $body = trim((string) ($input["body"] ?? ""));
    if (mb_strlen($body) > 500) {
        fail("Captions can contain up to 500 characters.");
    }
    $file = $_FILES["video"] ?? null;
    if (!$file || !is_array($file) || is_array($file["error"] ?? null)) {
        fail("Choose one MP4 or WebM video.");
    }
    if (($file["error"] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK) {
        fail(
            in_array(
                $file["error"],
                [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE],
                true,
            )
                ? "The upload exceeds the server limit. Choose a smaller video."
                : "The upload was interrupted. Please try again.",
            400,
        );
    }
    if (!is_uploaded_file($file["tmp_name"])) {
        fail("Invalid video upload.");
    }
    $size = filesize($file["tmp_name"]);
    if (!$size || $size > 50 * 1024 * 1024) {
        fail("Videos must be between 1 byte and 50 MB.", 413);
    }
    $extension = strtolower(
        pathinfo((string) $file["name"], PATHINFO_EXTENSION),
    );
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file["tmp_name"]);
    $handle = fopen($file["tmp_name"], "rb");
    $signature = fread($handle, 64);
    fclose($handle);
    $mp4 =
        $extension === "mp4" &&
        in_array($mime, ["video/mp4", "application/mp4"], true) &&
        substr($signature, 4, 4) === "ftyp";
    $webm =
        $extension === "webm" &&
        $mime === "video/webm" &&
        substr($signature, 0, 4) === "\x1a\x45\xdf\xa3";
    if (!$mp4 && !$webm) {
        fail("This file is not a supported MP4 or WebM video.");
    }
    $mime = $mp4 ? "video/mp4" : "video/webm";
    $filename = bin2hex(random_bytes(24)) . "." . ($mp4 ? "mp4" : "webm");
    $folder = $dir . "/videos";
    if (!is_dir($folder) && !mkdir($folder, 0700, true)) {
        fail("Video storage is temporarily unavailable.", 503);
    }
    $destination = $folder . "/" . $filename;
    try {
        $db->beginTransaction();
        $personal = (int) q(
            "SELECT COALESCE(SUM(bytes),0) FROM post_videos WHERE user_id=?",
            [$uid],
        )->fetchColumn();
        $total = (int) q(
            "SELECT COALESCE(SUM(bytes),0) FROM post_videos",
        )->fetchColumn();
        if ($personal + $size > 500 * 1024 * 1024) {
            $db->rollBack();
            fail(
                "Your video storage is full (500 MB). Delete an old video post before uploading another.",
                413,
            );
        }
        if ($total + $size > 5 * 1024 * 1024 * 1024) {
            $db->rollBack();
            fail(
                "The Hub’s video storage is full. Please try again later.",
                503,
            );
        }
        q("INSERT INTO posts(user_id,body) VALUES(?,?)", [$uid, $body]);
        $id = (int) $db->lastInsertId();
        if (!move_uploaded_file($file["tmp_name"], $destination)) {
            throw new RuntimeException("Video file move failed");
        }
        @chmod($destination, 0600);
        q(
            "INSERT INTO post_videos(post_id,user_id,filename,mime,bytes) VALUES(?,?,?,?,?)",
            [$id, $uid, $filename, $mime, $size],
        );
        $db->commit();
        out(["ok" => true, "id" => $id]);
    } catch (Throwable $e) {
        if ($db->inTransaction()) {
            $db->rollBack();
        }
        if (is_file($destination)) {
            @unlink($destination);
        }
        throw $e;
    }
}
if ($action === "video") {
    if (!$uid) {
        fail("Please sign in to watch this video.", 401);
    }
    if (!in_array($_SERVER["REQUEST_METHOD"], ["GET", "HEAD"], true)) {
        fail("Method not allowed.", 405);
    }
    $video = q(
        "SELECT v.* FROM post_videos v JOIN posts p ON p.id=v.post_id WHERE v.post_id=?",
        [(int) ($_GET["id"] ?? 0)],
    )->fetch();
    if (
        !$video ||
        !preg_match('/^[a-f0-9]{48}\.(mp4|webm)$/D', $video["filename"])
    ) {
        fail("Video not found.", 404);
    }
    $path = $dir . "/videos/" . $video["filename"];
    if (!is_file($path)) {
        fail("Video not found.", 404);
    }
    $size = filesize($path);
    $start = 0;
    $end = $size - 1;
    $range = $_SERVER["HTTP_RANGE"] ?? "";
    if ($range !== "") {
        if (
            !preg_match('/^bytes=(\d*)-(\d*)$/D', $range, $match) ||
            ($match[1] === "" && $match[2] === "")
        ) {
            header("Content-Range: bytes */" . $size);
            fail("Requested range is not available.", 416);
        }
        if ($match[1] === "") {
            $suffix = (int) $match[2];
            $start = max(0, $size - $suffix);
            if (!$suffix) {
                $start = $size;
            }
        } else {
            $start = (int) $match[1];
            if ($match[2] !== "") {
                $end = min($end, (int) $match[2]);
            }
        }
        if ($start > $end || $start >= $size) {
            header("Content-Range: bytes */" . $size);
            fail("Requested range is not available.", 416);
        }
        http_response_code(206);
        header("Content-Range: bytes $start-$end/$size");
    }
    $handle = fopen($path, "rb");
    if (!$handle) {
        fail("Video is temporarily unavailable.", 503);
    }
    session_write_close();
    header("Content-Type: " . $video["mime"]);
    header(
        'Content-Disposition: inline; filename="axiomate-video-' .
            (int) $video["post_id"] .
            "." .
            pathinfo($video["filename"], PATHINFO_EXTENSION) .
            '"',
    );
    header("Accept-Ranges: bytes");
    header("Content-Length: " . ($end - $start + 1));
    header("Cache-Control: private, no-store");
    header("Content-Security-Policy: default-src 'none'; sandbox");
    if ($_SERVER["REQUEST_METHOD"] === "HEAD") {
        fclose($handle);
        exit();
    }
    while (ob_get_level() > 0) {
        ob_end_clean();
    }
    fseek($handle, $start);
    $remaining = $end - $start + 1;
    @set_time_limit(0);
    while ($remaining > 0 && !feof($handle) && !connection_aborted()) {
        $chunk = fread($handle, min(65536, $remaining));
        if ($chunk === false || $chunk === "") {
            break;
        }
        echo $chunk;
        $remaining -= strlen($chunk);
        flush();
    }
    fclose($handle);
    exit();
}
