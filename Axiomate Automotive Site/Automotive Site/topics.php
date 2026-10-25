<?php
declare(strict_types=1);
function topicExtras(): array
{
    return [
        "engine-repair" => [
            "parts" => [
                "camshaft" => [
                    "Camshaft",
                    "Its lobes open the valves. It is timed to the crankshaft, so a timing error affects every cylinder.",
                ],
                "valve" => [
                    "Intake valve",
                    "Lets air in, then seals the port. A valve that does not seat lets compression leak back into the intake.",
                ],
                "gasket" => [
                    "Head gasket",
                    "Seals the head to the block and keeps combustion gas, coolant and oil in separate passages.",
                ],
                "piston" => [
                    "Piston & rings",
                    "The rings seal the cylinder wall and control oil. Worn rings cost compression and burn oil.",
                ],
                "crankshaft" => [
                    "Crankshaft",
                    "Turns the piston’s up-and-down motion into rotation. It runs on bearings fed with pressurised oil.",
                ],
                "oilpan" => [
                    "Oil pan & pickup",
                    "Holds the engine oil. The pump draws oil through the pickup screen; a blocked screen starves the bearings.",
                ],
            ],
            "scenarios" => [
                "A 2016 four-cylinder sedan is losing coolant and the customer has spotted milky residue under the oil cap. Before anyone talks about tear-down, you need to understand how the engine seals and lubricates itself.",
                "A V6 pickup has a steady misfire on cylinder 3. A compression test shows that cylinder about 40% lower than the others. The next step is to work out why it doesn’t seal.",
                "An engine with two low cylinders side by side also shows an oil-pressure warning at hot idle. The shop wants a rebuild quote, and your job is to gather the evidence first.",
            ],
            "checks" => [
                [
                    "gasket",
                    "Find the head gasket: the seal between the cylinder head and the block.",
                    "The head gasket sits between the head and block. Its passages keep combustion gas, coolant and oil apart, which is why a failure can cause milky oil or coolant loss.",
                ],
                [
                    "camshaft",
                    "Find the camshaft that controls valve timing.",
                    "The camshaft lobes open the valves in step with the crankshaft. If cam-to-crank timing is wrong, several cylinders can show low compression at once.",
                ],
                [
                    "valve",
                    "During a leak-down test, air hisses from the intake. Find the part that is most likely leaking.",
                    "Air at the intake points to the intake valve’s sealing path. Leak-down narrows down where the leak is; the head still has to be inspected to confirm why.",
                ],
            ],
        ],
        "hvac" => [
            "parts" => [
                "compressor" => [
                    "Compressor",
                    "Raises the pressure of refrigerant vapour so it can reject heat. It may be belt-driven or electric, and fixed or variable capacity.",
                ],
                "condenser" => [
                    "Condenser",
                    "Mounted at the front of the vehicle. Outside air carries heat away here; poor airflow raises high-side pressure.",
                ],
                "expansion" => [
                    "Expansion valve",
                    "Meters liquid refrigerant into the evaporator. Pressure and temperature drop sharply here.",
                ],
                "evaporator" => [
                    "Evaporator",
                    "Sits inside the HVAC case. It absorbs heat and moisture from cabin air, which is why it drips water under the car.",
                ],
                "blower" => [
                    "Blower motor",
                    "Pushes cabin air across the evaporator and heater core. Weak airflow is a different problem from warm air.",
                ],
            ],
            "scenarios" => [
                "A customer says the A/C “blows, but it isn’t cold on hot afternoons.” Start by mapping where heat enters the system and where it leaves.",
                "An SUV has weak airflow from every vent, but the air that does come out is cold. The cabin filter hasn’t been changed in 40,000 miles.",
                "On a 35 °C day, an automatic climate system swings between cold and warm. Pressures look “normal” at idle, and the customer has already had a recharge.",
            ],
            "checks" => [
                [
                    "evaporator",
                    "Find the evaporator, where heat is absorbed from cabin air.",
                    "The evaporator sits inside the HVAC case. Low-pressure refrigerant boils inside it and absorbs heat from the air the blower pushes through.",
                ],
                [
                    "condenser",
                    "Airflow across this part controls how much heat the system can reject. Find the condenser.",
                    "The condenser sits at the front of the vehicle. Blocked fins or a weak fan reduce heat rejection and raise high-side pressure.",
                ],
                [
                    "compressor",
                    "Find the variable-capacity compressor.",
                    "The compressor sets refrigerant flow. A variable-capacity unit changes its output on command, so control signals and sensor data belong in the diagnosis.",
                ],
            ],
        ],
        "adas" => [
            "parts" => [
                "camera" => [
                    "Forward camera",
                    "Mounted behind the windshield. It reads lane lines, signs and vehicles, and needs a clear view and correct aim.",
                ],
                "radar" => [
                    "Front radar",
                    "Measures distance and closing speed using radio waves. It sits behind the bumper or badge, so body repairs can affect its aim.",
                ],
                "corner" => [
                    "Corner radars",
                    "Watch the rear corners for blind-spot and cross-traffic alerts.",
                ],
                "ultrasonic" => [
                    "Parking sensors",
                    "Short-range ultrasonic sensors in the bumpers. Dirt, ice or paint thickness can affect them.",
                ],
                "module" => [
                    "ADAS control module",
                    "Combines camera and radar data (sensor fusion), then decides on warnings or assistance.",
                ],
            ],
            "scenarios" => [
                "A customer wants to know why lane-keeping switched itself off during a snowstorm, and whether something is broken.",
                "The windshield was replaced last week. Now the dash shows “Forward collision warning unavailable.” The glass shop says it “isn’t their problem.”",
                "Adaptive cruise brakes hard under one particular highway overpass. Both camera and radar communicate normally, with no stored faults.",
            ],
            "checks" => [
                [
                    "camera",
                    "Find the forward camera behind the windshield.",
                    "The camera sits behind the windshield near the mirror. Snow, glare or a dirty windshield can make the system unavailable without any fault being present.",
                ],
                [
                    "radar",
                    "After a front bumper repair, this sensor may need calibrating. Find the front radar.",
                    "The radar sits behind the bumper or emblem. Even a small change in mounting angle can misplace objects, so repair information decides whether calibration is needed.",
                ],
                [
                    "module",
                    "Find the module that combines camera and radar data.",
                    "The ADAS module fuses both inputs. When they disagree, the cause is investigated: aim, environment, or software. Neither sensor is assumed to be wrong.",
                ],
            ],
        ],
        "electrical-diagnostics" => [
            "parts" => [
                "battery" => [
                    "Battery",
                    "The 12 V source. Check resting voltage and voltage under load. They tell you different things.",
                ],
                "fuse" => [
                    "Fuse",
                    "Protects the wiring. It opens if current stays above its rating for long enough.",
                ],
                "relay" => [
                    "Relay",
                    "A small control current energises the coil, which closes contacts that carry the heavy fan current.",
                ],
                "load" => [
                    "Fan motor (load)",
                    "Turns electrical energy into work. It only runs properly with full voltage across it.",
                ],
                "ground" => [
                    "Ground connection",
                    "The return path to battery negative. Corrosion here adds resistance and steals voltage from the load.",
                ],
                "meter" => [
                    "Multimeter",
                    "Measures voltage drop across a connection while current is flowing, which finds hidden resistance.",
                ],
            ],
            "scenarios" => [
                "A radiator cooling fan won’t run. Before testing anything, you trace the circuit from the source, through the load, and back to ground.",
                "The fan runs, but slowly. The battery reads 12.6 V, yet only about 9 V reaches the motor while it runs. Somewhere, 3.6 V is going missing.",
                "After a front-end collision repair, several unrelated sensors report odd values at the same time. The customer has already replaced one sensor.",
            ],
            "checks" => [
                [
                    "fuse",
                    "Find the fuse that protects this circuit.",
                    "The fuse is in series near the source. It protects the wiring. If it blows, find out why before replacing it.",
                ],
                [
                    "ground",
                    "The meter shows 2.8 V across one connection with the fan running. Find that connection.",
                    "The ground connection is dropping 2.8 V under load. A good ground drops only a few tenths of a volt; corrosion here explains the slow fan.",
                ],
                [
                    "relay",
                    "Find the relay that switches the fan’s heavy current.",
                    "The relay lets a small control current switch the fan current. Burnt contacts can drop voltage even when the relay clicks.",
                ],
            ],
        ],
        "audio" => [
            "parts" => [
                "headunit" => [
                    "Head unit",
                    "The source and control centre. It sends a low-level audio signal to the amplifier.",
                ],
                "amplifier" => [
                    "Amplifier",
                    "Uses vehicle power to drive the speakers. It clips if pushed past what its supply and design allow.",
                ],
                "crossover" => [
                    "Crossover",
                    "Splits the signal so highs go to the tweeter and lows go to the woofer.",
                ],
                "tweeter" => [
                    "Tweeter",
                    "Small driver for high frequencies, such as cymbals and voices.",
                ],
                "woofer" => [
                    "Woofer",
                    "Large driver for low frequencies. It needs more power and good sealing in the door.",
                ],
            ],
            "scenarios" => [
                "A customer fitted new door speakers and now the sound is thin, with almost no bass.",
                "Since an aftermarket amplifier was installed, the rear speakers are silent while the fronts work normally.",
                "A whine rises and falls with engine speed through every speaker. It disappears when the engine is off.",
            ],
            "checks" => [
                [
                    "tweeter",
                    "Find the tweeter, the high-frequency driver.",
                    "The tweeter is the small driver near the top of the door. It handles high frequencies; bass needs the larger woofer.",
                ],
                [
                    "crossover",
                    "Find the crossover that routes frequency ranges.",
                    "The crossover sends highs to the tweeter and lows to the woofer. A wrong crossover point or bad wiring can make a system sound thin.",
                ],
                [
                    "amplifier",
                    "Output distorts when the gain is turned up too far. Find the amplifier.",
                    "The amplifier clips when it can’t follow the signal peaks. More gain past that point only adds distortion and heat.",
                ],
            ],
        ],
        "fuel" => [
            "parts" => [
                "pump" => [
                    "Fuel pump module",
                    "The pump sits in the tank and pushes fuel forward. It must provide enough pressure and enough flow under load.",
                ],
                "filter" => [
                    "Fuel filter",
                    "Traps contaminants. A restricted filter may pass idle tests but starve the engine under load.",
                ],
                "rail" => [
                    "Fuel rail",
                    "Feeds fuel to every injector. Its pressure sensor reports actual pressure to the controller.",
                ],
                "injector" => [
                    "Injectors",
                    "Spray a metered amount of fuel each time the controller commands them.",
                ],
                "o2" => [
                    "Oxygen sensor",
                    "Reads oxygen in the exhaust. The controller uses it to correct fuelling (fuel trim).",
                ],
            ],
            "scenarios" => [
                "A customer says the car “starts fine but hesitates when I accelerate onto the freeway.”",
                "Long-term fuel trim reads +18% on both banks at idle. The controller is adding fuel, and you need to know why.",
                "The engine stalls only under hard acceleration up a steep hill. Fuel pressure at idle is perfectly normal.",
            ],
            "checks" => [
                [
                    "injector",
                    "Find the injectors, the parts that meter the fuel.",
                    "The injectors sit under the rail. Each one opens for a commanded time, and pressure plus open time sets how much fuel is delivered.",
                ],
                [
                    "o2",
                    "Fuel trim is based on feedback from this sensor. Find the oxygen sensor.",
                    "The oxygen sensor in the exhaust tells the controller whether the mixture is rich or lean. Fuel trim is the controller’s correction.",
                ],
                [
                    "rail",
                    "Desired and measured fuel pressure disagree at this part. Find the fuel rail.",
                    "The rail’s pressure sensor reports actual pressure. A mismatch can come from supply, control or the sensor itself, so compare all three before replacing anything.",
                ],
            ],
        ],
        "diesel" => [
            "parts" => [
                "turbo" => [
                    "Turbocharger",
                    "Exhaust spins the turbine, which drives a compressor that pushes more air into the engine.",
                ],
                "intercooler" => [
                    "Charge-air cooler",
                    "Cools the hot, compressed intake air so the engine gets denser air.",
                ],
                "rail" => [
                    "Common rail",
                    "Stores fuel at very high pressure for all injectors. Only trained technicians should work on it.",
                ],
                "dpf" => [
                    "Particulate filter (DPF)",
                    "Traps soot. Regeneration burns the soot off; ash stays and builds up slowly.",
                ],
                "scr" => [
                    "SCR catalyst & DEF dosing",
                    "DEF is injected into the exhaust, and the catalyst uses it to reduce NOx emissions.",
                ],
            ],
            "scenarios" => [
                "A fleet driver asks why their diesel van has no spark plugs, and what the glow-plug light means on cold mornings.",
                "A delivery truck that mostly does short trips keeps showing a “DPF full” warning.",
                "An under-boost code sets under heavy load. There are no visible leaks at idle, and the turbo “sounds fine.”",
            ],
            "checks" => [
                [
                    "rail",
                    "Find the common rail that stores high-pressure fuel.",
                    "The common rail feeds every injector with fuel at very high pressure. Injection timing and quantity are controlled at the injectors.",
                ],
                [
                    "dpf",
                    "Find the diesel particulate filter.",
                    "The DPF traps soot. Short trips may not get hot enough to regenerate, which is why the warning keeps coming back.",
                ],
                [
                    "turbo",
                    "Desired and actual boost disagree. Find the turbocharger.",
                    "The turbo creates boost, but a mismatch can also come from air leaks, exhaust restriction, turbo control or a faulty sensor. Isolate the cause before replacing the turbo.",
                ],
            ],
        ],
        "sensors" => [
            "parts" => [
                "ect" => [
                    "Coolant temperature sensor",
                    "A thermistor: its resistance changes with temperature, so the voltage the ECU reads changes too.",
                ],
                "tps" => [
                    "Throttle position sensor",
                    "Reports throttle angle as a changing voltage between 0 and 5 V.",
                ],
                "wss" => [
                    "Wheel speed sensor",
                    "A toothed tone ring passes the sensor and creates pulses. Faster wheels produce more pulses per second.",
                ],
                "ecu" => [
                    "Controller (ECU)",
                    "Supplies a shared 5 V reference and ground, then reads each sensor’s signal.",
                ],
                "scope" => [
                    "Oscilloscope",
                    "Shows voltage over time, catching dropouts a meter would miss.",
                ],
            ],
            "scenarios" => [
                "The temperature gauge still reads cold after a 30-minute drive, and the heater takes forever to warm up.",
                "The ABS light comes on and one wheel-speed signal drops to zero above about 40 mph.",
                "Three different sensor codes set at once after an engine harness repair. All three sensors are new.",
            ],
            "checks" => [
                [
                    "ect",
                    "Find the temperature sensor (thermistor).",
                    "The coolant temperature sensor sits in the coolant passage. As temperature changes its resistance changes, and the ECU reads that as a voltage.",
                ],
                [
                    "wss",
                    "Find the speed sensor that produces repeating pulses.",
                    "The wheel speed sensor reads a toothed tone ring. Damaged teeth, a wide air gap or wiring faults can make the signal drop out at speed.",
                ],
                [
                    "ecu",
                    "Find the part that supplies the shared 5 V reference.",
                    "The ECU supplies the 5 V reference that several sensors share. A shorted reference or a bad shared ground can set codes on several new sensors at once.",
                ],
            ],
        ],
        "transmissions" => [
            "parts" => [
                "converter" => [
                    "Torque converter",
                    "Transfers engine power through fluid. Its lock-up clutch gives a direct mechanical link at cruise.",
                ],
                "planetary" => [
                    "Planetary gearset",
                    "A sun gear, planet gears and a ring gear. Holding or driving different members gives different ratios.",
                ],
                "clutch" => [
                    "Clutch pack",
                    "Friction and steel plates that apply hydraulically to hold or drive gearset members.",
                ],
                "valvebody" => [
                    "Valve body",
                    "Hydraulic control centre. Solenoids and valves route pressure to the clutches.",
                ],
                "output" => [
                    "Output shaft",
                    "Sends torque on to the driveline. Its speed is compared with input speed to check the ratio.",
                ],
            ],
            "scenarios" => [
                "A student asks why first gear feels strong but slow, and top gear fast but weak.",
                "On the highway, engine RPM flares without the car speeding up, and a converter-clutch code is stored.",
                "A harsh 2–3 upshift happens only when the fluid is hot. The commanded and actual ratios disagree during the shift.",
            ],
            "checks" => [
                [
                    "planetary",
                    "Find the planetary gearset.",
                    "The planetary gearset creates different ratios by holding or driving its sun, planet carrier or ring gear.",
                ],
                [
                    "converter",
                    "Find the torque converter.",
                    "The torque converter couples the engine through fluid. When its lock-up clutch slips, RPM flares without a matching gain in speed.",
                ],
                [
                    "valvebody",
                    "Find the valve body that directs hydraulic pressure.",
                    "The valve body routes pressure to the clutch packs. Worn bores or sticking valves can cause heat-related shift problems even when the electrical commands are correct.",
                ],
            ],
        ],
        "suspension" => [
            "parts" => [
                "spring" => [
                    "Coil spring",
                    "Supports the vehicle’s weight and sets ride height.",
                ],
                "strut" => [
                    "Strut (damper)",
                    "Controls spring motion by turning it into heat. It stops the car from bouncing.",
                ],
                "arm" => [
                    "Lower control arm",
                    "Locates the bottom of the knuckle. Worn bushings change alignment under load.",
                ],
                "tierod" => [
                    "Tie rod",
                    "Connects the steering rack to the knuckle. Toe is adjusted here.",
                ],
                "rack" => [
                    "Steering rack with EPS",
                    "Turns steering input into side-to-side movement. An electric motor provides the assist.",
                ],
            ],
            "scenarios" => [
                "A car keeps bouncing two or three times after every speed bump.",
                "After a pothole hit, both front tyres are wearing on their inside edges.",
                "After an alignment the steering wheel sits off-centre, and an electric power steering warning has appeared.",
            ],
            "checks" => [
                [
                    "strut",
                    "Find the damper (strut).",
                    "The strut damps spring motion. A worn damper lets the body keep bouncing; the spring still holds the weight.",
                ],
                [
                    "tierod",
                    "Toe is adjusted at this part. Find the tie rod.",
                    "Toe is set by adjusting the tie rods. A bent tie rod or wrong toe setting quickly wears the tyre edges.",
                ],
                [
                    "rack",
                    "Find the electric power steering rack.",
                    "The EPS rack has a steering-angle sensor and an electric motor. After alignment work it may need its centre position relearned, following manufacturer instructions.",
                ],
            ],
        ],
        "hybrid" => [
            "parts" => [
                "battery" => [
                    "Traction battery",
                    "High-voltage pack that stores energy for driving. It is separate from the 12 V battery.",
                ],
                "inverter" => [
                    "Inverter",
                    "Converts the battery’s DC into controlled AC for the motor, and back again during regeneration.",
                ],
                "motor" => [
                    "Traction motor",
                    "Drives the wheels. When braking it works as a generator and recovers energy.",
                ],
                "dcdc" => [
                    "DC-DC converter",
                    "Steps high voltage down to charge the 12 V battery and power accessories.",
                ],
                "port" => [
                    "Charge port",
                    "Where external charging power enters. Charging speed depends on the charger, the battery’s temperature and its state of charge.",
                ],
            ],
            "scenarios" => [
                "A customer with their first hybrid asks why the engine shuts off at every stoplight.",
                "An EV’s 12 V battery keeps going flat, even though the traction battery shows a full charge.",
                "On cold mornings, regenerative braking feels weaker and the friction brakes do more of the work.",
            ],
            "checks" => [
                [
                    "battery",
                    "Find the high-voltage traction battery.",
                    "The traction battery sits low in the floor. It powers the drive system; the separate 12 V battery runs the controls and accessories.",
                ],
                [
                    "dcdc",
                    "Find the part that keeps the 12 V battery charged from the high-voltage system.",
                    "The DC-DC converter replaces the alternator. If it or its control fails, the 12 V battery can go flat while the traction battery is full.",
                ],
                [
                    "motor",
                    "During regenerative braking this part works as a generator. Find the traction motor.",
                    "The traction motor recovers energy when braking. A cold battery accepts less charge, so regeneration is limited and the friction brakes take over.",
                ],
            ],
        ],
        "networks" => [
            "parts" => [
                "ecm" => [
                    "Engine control module",
                    "Runs the engine and shares data such as RPM and temperature on the network.",
                ],
                "bcm" => [
                    "Body control module",
                    "Controls lights, locks and other body functions, and reads switches.",
                ],
                "gateway" => [
                    "Gateway",
                    "Links network segments and controls access for diagnostic tools.",
                ],
                "bus" => [
                    "CAN bus (twisted pair)",
                    "Two wires, CAN-High and CAN-Low, carry messages between modules. The twist helps reject electrical noise.",
                ],
                "dlc" => [
                    "Diagnostic connector",
                    "The OBD-II port where the scan tool connects, usually through the gateway.",
                ],
            ],
            "scenarios" => [
                "A customer asks how pressing a door switch can turn on a dashboard light two metres away when there’s no direct wire between them.",
                "The instrument cluster goes dark and several “lost communication” codes set at the same moment.",
                "The gateway responds to the scan tool, but modules on the chassis segment drop out intermittently over bumps.",
            ],
            "checks" => [
                [
                    "dlc",
                    "Find the diagnostic connector where a scan tool connects.",
                    "The OBD-II connector gives diagnostic access, usually through the gateway. A scan tool can only reach what the gateway and network allow.",
                ],
                [
                    "bus",
                    "Find the CAN bus twisted pair.",
                    "CAN-High and CAN-Low are twisted together and carry messages between modules. Problems with the wiring, connectors or terminations can take several modules offline at once.",
                ],
                [
                    "gateway",
                    "Find the gateway that links the network segments.",
                    "The gateway routes messages between segments. If the gateway answers but a segment doesn’t, check that segment’s wiring, power and connectors.",
                ],
            ],
        ],
    ];
}
