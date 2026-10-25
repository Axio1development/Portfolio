<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$storageDirectory = __DIR__ . '/data';
$storagePath = $storageDirectory . '/reviews.json';
$allowedOrigin = 'https://avantyrenovationservice.com';

if (!is_dir($storageDirectory) && !mkdir($storageDirectory, 0750, true) && !is_dir($storageDirectory)) {
    respond(503, ['error' => 'Reviews are temporarily unavailable. Please try again.']);
}

function respond(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function loadReviews(string $path): array
{
    if (!file_exists($path)) {
        return [];
    }

    $contents = file_get_contents($path);
    $reviews = json_decode($contents ?: '[]', true);
    return is_array($reviews) ? $reviews : [];
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $reviews = loadReviews($storagePath);
    usort($reviews, static fn(array $a, array $b): int => ($b['created_at'] ?? '') <=> ($a['created_at'] ?? ''));
    $publicReviews = array_map(static fn(array $review): array => [
        'id' => $review['id'] ?? '',
        'name' => $review['name'] ?? '',
        'service' => $review['service'] ?? 'Pool service',
        'rating' => $review['rating'] ?? 0,
        'review' => $review['review'] ?? '',
        'created_at' => $review['created_at'] ?? '',
        'replies' => array_map(static fn(array $reply): array => [
            'name' => $reply['name'] ?? '',
            'reply' => $reply['reply'] ?? '',
            'created_at' => $reply['created_at'] ?? '',
        ], is_array($review['replies'] ?? null) ? $review['replies'] : []),
    ], array_slice($reviews, 0, 24));
    respond(200, ['reviews' => $publicReviews]);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: GET, POST');
    respond(405, ['error' => 'Method not allowed.']);
}

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && $origin !== $allowedOrigin) {
    respond(403, ['error' => 'This request is not allowed.']);
}

$rawBody = file_get_contents('php://input');
if ($rawBody === false || strlen($rawBody) > 6000) {
    respond(400, ['error' => 'Invalid review submission.']);
}

$input = json_decode($rawBody, true);
if (!is_array($input)) {
    respond(400, ['error' => 'Invalid review submission.']);
}

$name = trim((string)($input['name'] ?? ''));
$email = trim((string)($input['email'] ?? ''));
$service = trim((string)($input['service'] ?? ''));
$review = trim((string)($input['review'] ?? ''));
$reply = trim((string)($input['reply'] ?? ''));
$reviewId = trim((string)($input['review_id'] ?? ''));
$action = (string)($input['action'] ?? 'review');
$rating = filter_var($input['rating'] ?? null, FILTER_VALIDATE_INT);
$honeypot = trim((string)($input['website'] ?? ''));

if ($honeypot !== '') {
    respond(400, ['error' => 'Unable to submit this review.']);
}
if (!in_array($action, ['review', 'reply'], true)) {
    respond(422, ['error' => 'Invalid submission type.']);
}
if (!preg_match("/^[\\p{L}][\\p{L}\\p{M}'-]{1,49}$/u", $name)) {
    respond(422, ['error' => 'Please enter your first name (2–50 letters).']);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || mb_strlen($email) > 254) {
    respond(422, ['error' => 'Please enter a valid email address.']);
}
$reply = preg_replace('/[\x00-\x1F\x7F]/u', '', $reply) ?? '';
if ($action === 'reply') {
    if ($reviewId === '' || mb_strlen($reviewId) > 64) {
        respond(422, ['error' => 'Please choose a review to reply to.']);
    }
    if (mb_strlen($reply) < 2 || mb_strlen($reply) > 800) {
        respond(422, ['error' => 'Please write a reply between 2 and 800 characters.']);
    }
}
if ($action === 'review') {
    $allowedServices = ['New pool installation', 'Pool renovation', 'Weekly pool service', 'Water feature or hardscape', 'Pool equipment or repair'];
    if (!in_array($service, $allowedServices, true)) {
        respond(422, ['error' => 'Please select what you purchased.']);
    }
    if ($rating === false || $rating < 1 || $rating > 5) {
        respond(422, ['error' => 'Please choose a rating from 1 to 5 stars.']);
    }
    if (mb_strlen($review) < 10 || mb_strlen($review) > 1200) {
        respond(422, ['error' => 'Please write a review between 10 and 1,200 characters.']);
    }
}

$review = preg_replace('/[\x00-\x1F\x7F]/u', '', $review) ?? '';
$name = preg_replace('/[\x00-\x1F\x7F]/u', '', $name) ?? '';

$handle = fopen($storagePath, 'c+');
if ($handle === false || !flock($handle, LOCK_EX)) {
    respond(503, ['error' => 'Reviews are temporarily unavailable. Please try again.']);
}

$contents = stream_get_contents($handle);
$reviews = json_decode($contents ?: '[]', true);
$reviews = is_array($reviews) ? $reviews : [];
$newItem = [];
if ($action === 'reply') {
    $reviewIndex = null;
    foreach ($reviews as $index => $savedReview) {
        if (($savedReview['id'] ?? '') === $reviewId) {
            $reviewIndex = $index;
            break;
        }
    }
    if ($reviewIndex === null) {
        flock($handle, LOCK_UN);
        fclose($handle);
        respond(404, ['error' => 'This review is no longer available.']);
    }
    $newItem = [
        'name' => $name,
        'email' => $email,
        'reply' => $reply,
        'created_at' => gmdate('c'),
    ];
    $reviews[$reviewIndex]['replies'] = is_array($reviews[$reviewIndex]['replies'] ?? null) ? $reviews[$reviewIndex]['replies'] : [];
    $reviews[$reviewIndex]['replies'][] = $newItem;
} else {
    $newReview = [
        'id' => bin2hex(random_bytes(16)),
        'name' => $name,
        'email' => $email,
        'service' => $service,
        'rating' => $rating,
        'review' => $review,
        'created_at' => gmdate('c'),
        'replies' => [],
    ];
    $reviews[] = $newReview;
    $newItem = $newReview;
}
rewind($handle);
ftruncate($handle, 0);
fwrite($handle, json_encode($reviews, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
fflush($handle);
flock($handle, LOCK_UN);
fclose($handle);

respond(201, [$action => $newItem]);
