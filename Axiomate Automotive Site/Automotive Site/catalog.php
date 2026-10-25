<?php
declare(strict_types=1);
require_once __DIR__ . "/topics.php";

function quizActivities(array $lessons, int $lessonOffset = 0): array
{
    $out = [];
    foreach ($lessons as $li => [$title, $reading, $questions]) {
        foreach (
            $questions
            as $qi => [$prompt, $correct, $w1, $w2, $w3, $why]
        ) {
            $options = [$correct, $w1, $w2, $w3];
            $order = [0, 1, 2, 3];
            mt_srand(crc32($prompt));
            for ($i = 3; $i > 0; $i--) {
                $j = mt_rand(0, $i);
                [$order[$i], $order[$j]] = [$order[$j], $order[$i]];
            }
            $out[] = [
                "title" => $title,
                "lesson" => $li + $lessonOffset,
                "q" => $qi + 1,
                "qcount" => count($questions),
                "reading" => $reading,
                "type" => "quiz",
                "diagram" => null,
                "prompt" => $prompt,
                "options" => array_map(fn($k) => $options[$k], $order),
                "answer" => array_search(0, $order, true),
                "explanation" => $why,
            ];
        }
    }
    mt_srand();
    return $out;
}
function trackMeta(): array
{
    return [
        "engine-repair" => ["Engine repair", "Powertrain", "orange"],
        "hvac" => ["HVAC systems", "Climate control", "teal"],
        "adas" => ["ADAS", "Driver assistance", "blue"],
        "electrical-diagnostics" => [
            "Electrical diagnostics",
            "Electrical",
            "blue",
        ],
        "audio" => ["Sound systems", "Electrical", "blue"],
        "fuel" => ["Fuel systems", "Powertrain", "orange"],
        "diesel" => ["Diesel systems", "Powertrain", "orange"],
        "sensors" => ["Sensors & signals", "Electrical", "blue"],
        "transmissions" => ["Transmissions", "Drivetrain", "orange"],
        "suspension" => ["Steering & suspension", "Chassis", "teal"],
        "hybrid" => ["Hybrid & EV awareness", "Electrified vehicles", "teal"],
        "networks" => ["Vehicle networks", "Electrical", "blue"],
    ];
}
function expandedCatalog(): array
{
    static $cache;
    if ($cache) {
        return $cache;
    }
    $result = [];
    $extras = topicExtras();
    foreach (trackMeta() as $slug => [$topic, $category, $color]) {
        $x = $extras[$slug];
        $content = require __DIR__ . "/lessons/" . $slug . ".php";
        $explore = array_map(
            fn($p) => ["label" => $p[0], "info" => $p[1]],
            $x["parts"],
        );
        foreach (["Beginner", "Intermediate", "Advanced"] as $li => $level) {
            $lessons = quizActivities($content[$level]);
            [$target, $prompt, $why] = $x["checks"][$li];
            $lessons[] = [
                "title" => "Workshop check",
                "lesson" => count($content[$level]),
                "q" => 1,
                "qcount" => 1,
                "reading" =>
                    $x["scenarios"][$li] .
                    " Use what you learned in this level to find the right component.",
                "type" => "identify",
                "diagram" => $slug,
                "prompt" => $prompt,
                "parts" => array_map(fn($p) => $p[0], $x["parts"]),
                "answer" => $target,
                "explanation" => $why,
            ];
            $count = count($lessons);
            $name = ctype_upper(substr($topic, 1, 1))
                ? $topic
                : lcfirst($topic);
            $result[] = [
                "id" => $slug . "-" . strtolower($level),
                "scenario" => $x["scenarios"][$li],
                "explore" => $explore,
                "title" => $topic . " · " . $level,
                "topic" => $topic,
                "category" => $category,
                "level" => $level,
                "minutes" => (int) round($count * 2.5),
                "description" => match ($level) {
                    "Beginner"
                        => "Build a working vocabulary and understand the core components of " .
                        $name .
                        ".",
                    "Intermediate"
                        => "Connect system behaviour with measurements and diagnostic evidence.",
                    "Advanced"
                        => "Work through data interpretation, fault patterns and real diagnostic cases.",
                },
                "color" => $color,
                "visual" => $slug,
                "lessons" => $lessons,
                "lesson_count" => $count,
                "lesson_groups" => count($content[$level]) + 1,
                "author" => "Axiomate",
            ];
        }
    }
    return $cache = $result;
}
