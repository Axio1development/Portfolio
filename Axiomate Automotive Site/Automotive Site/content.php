<?php
declare(strict_types=1);
require_once __DIR__ . "/catalog.php";

function foundationCourses(): array
{
    return [
        [
            "engine",
            "Engine fundamentals",
            "Powertrain",
            "orange",
            "Get to know the components that turn combustion into motion.",
            "A four-stroke gasoline engine converts the energy in fuel into rotating motion. The piston moves inside the cylinder, the connecting rod transfers its force, and the crankshaft converts this movement into rotation. The cylinder head contains the valves that control airflow.",
            "Select the crankshaft in the engine diagram.",
            [
                "head" => "Cylinder head",
                "piston" => "Piston",
                "rod" => "Connecting rod",
                "crankshaft" => "Crankshaft",
            ],
            "crankshaft",
            "The crankshaft sits below the connecting rod. Its offset journals convert the piston’s back-and-forth movement into rotation.",
        ],
        [
            "electrical",
            "Electrical essentials",
            "Electrical",
            "blue",
            "Follow the path of current through a simple vehicle circuit.",
            "A basic circuit needs a source, a closed conducting path, and a load. In this simplified lighting circuit, the battery supplies energy, the fuse protects the wiring, the switch controls the path, and the lamp converts electrical energy into light.",
            "Select the fuse that protects this circuit.",
            [
                "battery" => "Battery",
                "fuse" => "Fuse",
                "switch" => "Switch",
                "lamp" => "Lamp",
            ],
            "fuse",
            "The fuse is placed in series with the circuit. It opens if current exceeds its rated capacity for sufficient time, helping protect the wiring.",
        ],
        [
            "brakes",
            "Braking systems",
            "Chassis",
            "red",
            "Explore how hydraulic pressure becomes braking force.",
            "In a disc brake, hydraulic pressure moves a piston in the caliper. The caliper presses friction pads against a rotor attached to the wheel hub. Friction opposes rotation and converts kinetic energy into heat.",
            "Select the brake caliper in the diagram.",
            [
                "rotor" => "Brake rotor",
                "caliper" => "Brake caliper",
                "pad" => "Friction pad",
                "hub" => "Wheel hub",
            ],
            "caliper",
            "The caliper straddles the rotor and applies the pads. Hydraulic pressure acts on its piston to create clamping force.",
        ],
        [
            "cooling",
            "Engine cooling",
            "Powertrain",
            "teal",
            "Trace the flow of heat from the engine to the outside air.",
            "Liquid cooling carries excess heat away from the engine. A pump circulates coolant, a thermostat regulates flow to the radiator, and the radiator transfers heat to the surrounding air.",
            "Select the radiator that transfers heat to the air.",
            [
                "engine" => "Engine water jacket",
                "thermostat" => "Thermostat",
                "radiator" => "Radiator",
                "pump" => "Coolant pump",
            ],
            "radiator",
            "The radiator uses tubes and fins to increase the surface area available for transferring heat from the coolant to air.",
        ],
    ];
}

function courses(): array
{
    static $cache;
    if ($cache) {
        return $cache;
    }
    $extra = require __DIR__ . "/lessons/foundations.php";
    $result = [];
    foreach (
        foundationCourses()
        as [
            $id,
            $title,
            $category,
            $color,
            $description,
            $intro,
            $task,
            $parts,
            $target,
            $why,
        ]
    ) {
        $lessons = array_merge(
            [
                [
                    "title" => "Identify the component",
                    "lesson" => 0,
                    "q" => 1,
                    "qcount" => 1,
                    "reading" => $intro,
                    "type" => "identify",
                    "diagram" => $id,
                    "prompt" => $task,
                    "parts" => $parts,
                    "answer" => $target,
                    "explanation" => $why,
                ],
            ],
            quizActivities($extra[$id], 1),
        );
        $result[] = [
            "id" => $id,
            "title" => $title,
            "category" => $category,
            "level" => "Beginner",
            "minutes" => (int) round(count($lessons) * 2.5),
            "description" => $description,
            "color" => $color,
            "visual" => $id,
            "lessons" => $lessons,
            "lesson_count" => count($lessons),
            "lesson_groups" => count($extra[$id]) + 1,
            "author" => "Axiomate",
        ];
    }
    return $cache = array_merge($result, expandedCatalog());
}
