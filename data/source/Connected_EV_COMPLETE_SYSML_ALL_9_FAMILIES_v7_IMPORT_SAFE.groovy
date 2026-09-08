modelScript('''
{
  "source_namespace": "demo:connected-ev:complete-sysml-all9:v7-import-safe",
  "operations": [
    {
      "op": "element",
      "external_id": "PKG",
      "kind": "Package",
      "name": "Connected EV Requirements-Driven Demonstration",
      "owner": "$root",
      "documentation": "Requirements-driven connected EV SysML demonstration: requirements, architecture, interfaces, behavior, parametrics, verification, and runtime occurrences in one semantic model."
    },
    {
      "op": "element",
      "external_id": "PKG_COMMON",
      "kind": "ModelLibrary",
      "name": "00 Common Library",
      "owner": "handle:PKG",
      "documentation": "Reusable SysML definitions for primitive types, flow payload Blocks, interface contracts, and boundary port implementation types."
    },
    {
      "op": "element",
      "external_id": "PKG_TYPES",
      "kind": "Package",
      "name": "Types",
      "owner": "handle:PKG_COMMON"
    },
    {
      "op": "element",
      "external_id": "PKG_IF",
      "kind": "Package",
      "name": "Interfaces",
      "owner": "handle:PKG_COMMON"
    },
    {
      "op": "element",
      "external_id": "PKG_REQ",
      "kind": "Package",
      "name": "10 Requirements and Verification",
      "owner": "handle:PKG"
    },
    {
      "op": "element",
      "external_id": "PKG_REQ_MISSION",
      "kind": "Package",
      "name": "Stakeholder and System Requirements",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "element",
      "external_id": "PKG_REQ_ENG",
      "kind": "Package",
      "name": "Engineering Requirements",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "element",
      "external_id": "PKG_REQ_SUB",
      "kind": "Package",
      "name": "Subsystem Requirements",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "element",
      "external_id": "PKG_VERIFY",
      "kind": "Package",
      "name": "Verification",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "element",
      "external_id": "PKG_VERIFY_VIEW",
      "kind": "Package",
      "name": "Verification Traceability View",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "element",
      "external_id": "PKG_VERIFY_ALL",
      "kind": "Package",
      "name": "Additional Verification Cases",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "element",
      "external_id": "PKG_UC",
      "kind": "Package",
      "name": "20 Operational Use Cases",
      "owner": "handle:PKG"
    },
    {
      "op": "element",
      "external_id": "PKG_ARCH",
      "kind": "Package",
      "name": "30 Vehicle Architecture",
      "owner": "handle:PKG"
    },
    {
      "op": "element",
      "external_id": "PKG_COMPONENTS",
      "kind": "Package",
      "name": "Component Definitions",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "PKG_BEHAV",
      "kind": "Package",
      "name": "40 Behavior",
      "owner": "handle:PKG"
    },
    {
      "op": "element",
      "external_id": "PKG_ACT",
      "kind": "Package",
      "name": "Activities",
      "owner": "handle:PKG_BEHAV"
    },
    {
      "op": "element",
      "external_id": "PKG_STATE",
      "kind": "Package",
      "name": "State Machines",
      "owner": "handle:PKG_BEHAV"
    },
    {
      "op": "element",
      "external_id": "PKG_SEQ",
      "kind": "Package",
      "name": "Interactions",
      "owner": "handle:PKG_BEHAV"
    },
    {
      "op": "element",
      "external_id": "PKG_SIG",
      "kind": "Package",
      "name": "Signals",
      "owner": "handle:PKG_BEHAV"
    },
    {
      "op": "element",
      "external_id": "PKG_ANALYSIS",
      "kind": "Package",
      "name": "50 Parametrics and Analysis",
      "owner": "handle:PKG"
    },
    {
      "op": "element",
      "external_id": "PKG_CONFIG",
      "kind": "Package",
      "name": "60 Configurations and Runtime",
      "owner": "handle:PKG"
    },
    {
      "op": "element",
      "external_id": "REAL",
      "kind": "PrimitiveType",
      "name": "Real",
      "owner": "handle:PKG_TYPES"
    },
    {
      "op": "element",
      "external_id": "BOOL",
      "kind": "PrimitiveType",
      "name": "Boolean",
      "owner": "handle:PKG_TYPES"
    },
    {
      "op": "element",
      "external_id": "DATA_DRIVER",
      "kind": "Block",
      "name": "DriverCommandData",
      "owner": "handle:PKG_TYPES",
      "documentation": "Flow payload classifier used by typed interface contracts and ItemFlows."
    },
    {
      "op": "element",
      "external_id": "DATA_TORQUE",
      "kind": "Block",
      "name": "TorqueCommandData",
      "owner": "handle:PKG_TYPES",
      "documentation": "Flow payload classifier used by typed interface contracts and ItemFlows."
    },
    {
      "op": "element",
      "external_id": "DATA_SENSOR",
      "kind": "Block",
      "name": "SensorData",
      "owner": "handle:PKG_TYPES",
      "documentation": "Flow payload classifier used by typed interface contracts and ItemFlows."
    },
    {
      "op": "element",
      "external_id": "DATA_BRAKE",
      "kind": "Block",
      "name": "BrakeCommandData",
      "owner": "handle:PKG_TYPES",
      "documentation": "Flow payload classifier used by typed interface contracts and ItemFlows."
    },
    {
      "op": "element",
      "external_id": "DATA_HV",
      "kind": "Block",
      "name": "HighVoltagePowerData",
      "owner": "handle:PKG_TYPES",
      "documentation": "Flow payload classifier used by typed interface contracts and ItemFlows."
    },
    {
      "op": "element",
      "external_id": "DATA_THERMAL",
      "kind": "Block",
      "name": "ThermalFlowData",
      "owner": "handle:PKG_TYPES",
      "documentation": "Flow payload classifier used by typed interface contracts and ItemFlows."
    },
    {
      "op": "element",
      "external_id": "DATA_CHARGE",
      "kind": "Block",
      "name": "ChargePowerData",
      "owner": "handle:PKG_TYPES",
      "documentation": "Flow payload classifier used by typed interface contracts and ItemFlows."
    },
    {
      "op": "element",
      "external_id": "DATA_DIAG",
      "kind": "Block",
      "name": "DiagnosticServiceData",
      "owner": "handle:PKG_TYPES",
      "documentation": "Flow payload classifier used by typed interface contracts and ItemFlows."
    },
    {
      "op": "element",
      "external_id": "DATA_MOTOR",
      "kind": "Block",
      "name": "MotorElectricalPowerData",
      "owner": "handle:PKG_TYPES",
      "documentation": "Flow payload classifier used by typed interface contracts and ItemFlows."
    },
    {
      "op": "element",
      "external_id": "IF_DRIVER",
      "kind": "InterfaceBlock",
      "name": "DriverCommandInterface",
      "owner": "handle:PKG_IF"
    },
    {
      "op": "element",
      "external_id": "FP_DRIVER",
      "kind": "FlowProperty",
      "name": "driverCommand",
      "owner": "handle:IF_DRIVER",
      "type_ref": "handle:DATA_DRIVER",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "IF_TORQUE",
      "kind": "InterfaceBlock",
      "name": "TorqueCommandInterface",
      "owner": "handle:PKG_IF"
    },
    {
      "op": "element",
      "external_id": "FP_TORQUE",
      "kind": "FlowProperty",
      "name": "torqueCommand",
      "owner": "handle:IF_TORQUE",
      "type_ref": "handle:DATA_TORQUE",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "IF_SENSOR",
      "kind": "InterfaceBlock",
      "name": "SensorDataInterface",
      "owner": "handle:PKG_IF"
    },
    {
      "op": "element",
      "external_id": "FP_SENSOR",
      "kind": "FlowProperty",
      "name": "sensorData",
      "owner": "handle:IF_SENSOR",
      "type_ref": "handle:DATA_SENSOR",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "IF_BRAKE",
      "kind": "InterfaceBlock",
      "name": "BrakeCommandInterface",
      "owner": "handle:PKG_IF"
    },
    {
      "op": "element",
      "external_id": "FP_BRAKE",
      "kind": "FlowProperty",
      "name": "brakeCommand",
      "owner": "handle:IF_BRAKE",
      "type_ref": "handle:DATA_BRAKE",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "IF_HV",
      "kind": "InterfaceBlock",
      "name": "HighVoltagePowerInterface",
      "owner": "handle:PKG_IF"
    },
    {
      "op": "element",
      "external_id": "FP_HV",
      "kind": "FlowProperty",
      "name": "dcPower",
      "owner": "handle:IF_HV",
      "type_ref": "handle:DATA_HV",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "IF_THERMAL",
      "kind": "InterfaceBlock",
      "name": "ThermalFluidInterface",
      "owner": "handle:PKG_IF"
    },
    {
      "op": "element",
      "external_id": "FP_THERMAL",
      "kind": "FlowProperty",
      "name": "thermalFlow",
      "owner": "handle:IF_THERMAL",
      "type_ref": "handle:DATA_THERMAL",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "IF_CHARGE",
      "kind": "InterfaceBlock",
      "name": "ChargePowerInterface",
      "owner": "handle:PKG_IF"
    },
    {
      "op": "element",
      "external_id": "FP_CHARGE",
      "kind": "FlowProperty",
      "name": "chargePower",
      "owner": "handle:IF_CHARGE",
      "type_ref": "handle:DATA_CHARGE",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "IF_DIAG",
      "kind": "InterfaceBlock",
      "name": "DiagnosticServiceInterface",
      "owner": "handle:PKG_IF"
    },
    {
      "op": "element",
      "external_id": "FP_DIAG",
      "kind": "FlowProperty",
      "name": "diagnosticData",
      "owner": "handle:IF_DIAG",
      "type_ref": "handle:DATA_DIAG",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "IF_MOTOR",
      "kind": "InterfaceBlock",
      "name": "MotorElectricalPowerInterface",
      "owner": "handle:PKG_IF"
    },
    {
      "op": "element",
      "external_id": "FP_MOTOR",
      "kind": "FlowProperty",
      "name": "motorElectricalPower",
      "owner": "handle:IF_MOTOR",
      "type_ref": "handle:DATA_MOTOR",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "FULL_CHARGE_TYPE",
      "kind": "Block",
      "name": "ChargeInletAssembly",
      "owner": "handle:PKG_IF",
      "documentation": "Physical boundary assembly used to type FullPorts for vehicle charging access."
    },
    {
      "op": "element",
      "external_id": "FULL_CHARGE_FLOW",
      "kind": "FlowProperty",
      "name": "chargePower",
      "owner": "handle:FULL_CHARGE_TYPE",
      "type_ref": "handle:DATA_CHARGE",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "FULL_SERVICE_TYPE",
      "kind": "Block",
      "name": "ServiceAccessAssembly",
      "owner": "handle:PKG_IF",
      "documentation": "Physical/service boundary assembly used to type FullPorts for diagnostic access."
    },
    {
      "op": "element",
      "external_id": "FULL_SERVICE_FLOW",
      "kind": "FlowProperty",
      "name": "diagnosticData",
      "owner": "handle:FULL_SERVICE_TYPE",
      "type_ref": "handle:DATA_DIAG",
      "flow_direction": "InOut"
    },
    {
      "op": "element",
      "external_id": "REQ_STK_001",
      "kind": "Requirement",
      "name": "Safe Controlled Transportation",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "STK-001",
      "requirement_text": "The electric vehicle shall provide controlled transportation and shall transition to a safe operating state when a critical vehicle fault is detected.",
      "documentation": "Rationale: Safety is the governing stakeholder objective for all vehicle behavior. Acceptance: Critical-fault injection results in a defined safe/degraded state without uncontrolled propulsion."
    },
    {
      "op": "element",
      "external_id": "REQ_STK_002",
      "kind": "Requirement",
      "name": "Nominal Driving Range",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "STK-002",
      "requirement_text": "The electric vehicle shall provide at least 400 km of nominal driving range on a fully usable battery under the defined nominal drive cycle.",
      "documentation": "Rationale: Range is a primary customer-value and sizing driver for the energy system. Acceptance: Calculated or measured nominal range is >= 400 km."
    },
    {
      "op": "element",
      "external_id": "REQ_STK_003",
      "kind": "Requirement",
      "name": "Responsive Acceleration",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "STK-003",
      "requirement_text": "The electric vehicle shall accelerate from 0 to 100 km/h in 7.0 seconds or less at nominal mass, battery state, and environmental conditions.",
      "documentation": "Rationale: Acceleration sets the required tractive-force and power envelope. Acceptance: 0-100 km/h elapsed time is <= 7.0 s under nominal test conditions."
    },
    {
      "op": "element",
      "external_id": "REQ_STK_004",
      "kind": "Requirement",
      "name": "Convenient Charging",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "STK-004",
      "requirement_text": "The electric vehicle shall support compatible DC fast charging from 10 percent to 80 percent state of charge in 35 minutes or less under nominal battery temperature.",
      "documentation": "Rationale: Charging time materially affects vehicle availability and customer acceptance. Acceptance: 10%-80% SOC charge time is <= 35 minutes at nominal battery temperature."
    },
    {
      "op": "element",
      "external_id": "REQ_STK_005",
      "kind": "Requirement",
      "name": "Energy Efficiency",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "STK-005",
      "requirement_text": "The electric vehicle shall consume no more than 0.20 kWh per km over the defined nominal drive cycle.",
      "documentation": "Rationale: Energy efficiency drives range, battery sizing, and operating cost. Acceptance: Nominal-cycle energy consumption is <= 0.20 kWh/km."
    },
    {
      "op": "element",
      "external_id": "REQ_STK_006",
      "kind": "Requirement",
      "name": "Intuitive Driver Operation",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "STK-006",
      "requirement_text": "The electric vehicle shall allow the driver to start, drive, brake, stop, and observe vehicle status using a consistent set of driver controls and indications.",
      "documentation": "Rationale: The vehicle must expose complex system behavior through a simple operating interface. Acceptance: Driver can complete start-drive-brake-stop workflow and observe required status indications without service intervention."
    },
    {
      "op": "element",
      "external_id": "REQ_STK_007",
      "kind": "Requirement",
      "name": "Serviceability and Diagnostics",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "STK-007",
      "requirement_text": "The electric vehicle shall provide service personnel with diagnostic trouble codes, vehicle status, and subsystem telemetry through an authorized diagnostic interface.",
      "documentation": "Rationale: Fast fault isolation reduces maintenance time and lifecycle cost. Acceptance: Authorized service session can read active/stored DTCs and required telemetry."
    },
    {
      "op": "element",
      "external_id": "REQ_STK_008",
      "kind": "Requirement",
      "name": "Resilient Degraded Operation",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "STK-008",
      "requirement_text": "The electric vehicle shall preserve controllability through defined degraded operating modes when a recoverable subsystem fault occurs.",
      "documentation": "Rationale: Graceful degradation prevents a single recoverable fault from becoming a hazardous loss of function. Acceptance: Injected recoverable faults result in defined derating/degraded behavior while controllability is preserved."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_001",
      "kind": "Requirement",
      "name": "Commanded Startup",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "SYS-001",
      "requirement_text": "The vehicle shall enter the Ready state within 2.0 seconds after receiving a valid StartCommand when startup prerequisites are satisfied.",
      "documentation": "Rationale: Predictable startup behavior connects driver intent to executable control behavior. Acceptance: Ready state is reached <= 2.0 s after a valid command."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_002",
      "kind": "Requirement",
      "name": "Propulsion Delivery",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "SYS-002",
      "requirement_text": "The vehicle shall deliver commanded positive and negative wheel torque within validated operating limits.",
      "documentation": "Rationale: This is the central traction function required to meet vehicle performance. Acceptance: Measured wheel torque tracks validated command within defined operating limits."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_003",
      "kind": "Requirement",
      "name": "Energy Storage",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "SYS-003",
      "requirement_text": "The vehicle shall provide at least 82 kWh of usable traction-energy storage at beginning of life.",
      "documentation": "Rationale: Usable battery energy establishes the analytical basis for the range requirement. Acceptance: Usable traction energy is >= 82 kWh."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_004",
      "kind": "Requirement",
      "name": "Controlled Braking",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "SYS-004",
      "requirement_text": "The vehicle shall initiate commanded braking within 100 ms of a valid driver or vehicle-control braking request.",
      "documentation": "Rationale: Brake response time is a direct controllability and safety requirement. Acceptance: Brake-system response begins <= 100 ms after valid command receipt."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_005",
      "kind": "Requirement",
      "name": "Thermal Control",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "SYS-005",
      "requirement_text": "The vehicle shall actively control battery, inverter, motor, and charging thermal conditions within their defined operating envelopes.",
      "documentation": "Rationale: Thermal control protects performance, battery life, and electrical safety. Acceptance: Monitored component temperatures remain within specified operating envelopes."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_006",
      "kind": "Requirement",
      "name": "Vehicle State Estimation",
      "owner": "handle:PKG_REQ_MISSION",
      "requirement_id": "SYS-006",
      "requirement_text": "The vehicle shall provide control functions with valid estimates of vehicle speed, battery state of charge, and critical temperatures.",
      "documentation": "Rationale: Closed-loop control and fault management depend on trusted vehicle state data. Acceptance: Required state estimates are available, plausible, and within specified accuracy limits."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_007",
      "kind": "Requirement",
      "name": "Driver Information and Controls",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "SYS-007",
      "requirement_text": "The vehicle shall present drive state, speed, state of charge, active drive mode, and safety-relevant faults to the driver.",
      "documentation": "Rationale: Driver awareness is required for normal operation and fault response. Acceptance: All required status items are visible and update when model/runtime values change."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_008",
      "kind": "Requirement",
      "name": "Charge Management",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "SYS-008",
      "requirement_text": "The vehicle shall coordinate compatible AC/DC charging and shall inhibit traction propulsion while the vehicle is in an active charging state.",
      "documentation": "Rationale: Charging must be coordinated with vehicle state and high-voltage safety. Acceptance: Compatible charging session is controlled and traction torque remains inhibited while Charging is active."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_009",
      "kind": "Requirement",
      "name": "Diagnostic Management",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "SYS-009",
      "requirement_text": "The vehicle shall detect, timestamp, store, and report diagnostic trouble codes for monitored subsystem faults.",
      "documentation": "Rationale: Structured diagnostics enable rapid maintenance and traceable fault history. Acceptance: Injected monitored faults create readable timestamped DTC records."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_010",
      "kind": "Requirement",
      "name": "High-Voltage Isolation",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "SYS-010",
      "requirement_text": "The vehicle shall open the high-voltage traction path when a confirmed isolation fault or crash isolation request is present.",
      "documentation": "Rationale: High-voltage isolation protects occupants and service personnel. Acceptance: HV traction path is de-energized after confirmed isolation/crash request within the defined safety time."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_011",
      "kind": "Requirement",
      "name": "Fault Management",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "SYS-011",
      "requirement_text": "The vehicle shall transition to a defined Fault or Degraded state within 500 ms after confirmation of a critical monitored fault.",
      "documentation": "Rationale: A bounded reaction time makes fault behavior deterministic and verifiable. Acceptance: Confirmed critical fault causes Fault/Degraded transition <= 500 ms."
    },
    {
      "op": "element",
      "external_id": "REQ_SYS_012",
      "kind": "Requirement",
      "name": "Interface Integrity",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "SYS-012",
      "requirement_text": "The vehicle shall use typed and compatible interfaces for power, commands, sensor data, thermal exchange, charging, diagnostics, and driver input.",
      "documentation": "Rationale: Typed interfaces are the basis for integration control and model-based impact analysis. Acceptance: All modeled connector endpoints use compatible typed interfaces and all ItemFlows resolve to their connectors."
    },
    {
      "op": "element",
      "external_id": "REQ_PERF_001",
      "kind": "Requirement",
      "name": "Tractive Force",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "PERF-001",
      "requirement_text": "The propulsion system shall provide at least 4500 N of tractive force at the defined nominal launch analysis point.",
      "documentation": "Rationale: Provides a measurable engineering target traceable to architecture, analysis, and verification. Acceptance: Calculated tractive force is >= 4500 N."
    },
    {
      "op": "element",
      "external_id": "REQ_PERF_002",
      "kind": "Requirement",
      "name": "Electrical Traction Power",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "PERF-002",
      "requirement_text": "The propulsion system shall support at least 135 kW of electrical traction power at the defined nominal performance point.",
      "documentation": "Rationale: Provides a measurable engineering target traceable to architecture, analysis, and verification. Acceptance: Calculated electrical traction power is >= 135 kW."
    },
    {
      "op": "element",
      "external_id": "REQ_PERF_003",
      "kind": "Requirement",
      "name": "Nominal Range Margin",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "PERF-003",
      "requirement_text": "The vehicle energy architecture shall analytically demonstrate at least 400 km of nominal range using usable battery energy and nominal consumption.",
      "documentation": "Rationale: Provides a measurable engineering target traceable to architecture, analysis, and verification. Acceptance: Range analysis result is >= 400 km."
    },
    {
      "op": "element",
      "external_id": "REQ_PERF_004",
      "kind": "Requirement",
      "name": "Regenerative Braking",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "PERF-004",
      "requirement_text": "The propulsion and energy systems shall accept at least 50 kW of regenerative braking power when battery and traction limits permit.",
      "documentation": "Rationale: Provides a measurable engineering target traceable to architecture, analysis, and verification. Acceptance: Accepted regenerative power is >= 50 kW under valid regen conditions."
    },
    {
      "op": "element",
      "external_id": "REQ_PERF_005",
      "kind": "Requirement",
      "name": "Top Speed",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "PERF-005",
      "requirement_text": "The vehicle shall achieve at least 160 km/h under nominal mass, battery, tire, and environmental conditions.",
      "documentation": "Rationale: Provides a measurable engineering target traceable to architecture, analysis, and verification. Acceptance: Measured top speed is >= 160 km/h."
    },
    {
      "op": "element",
      "external_id": "REQ_PERF_006",
      "kind": "Requirement",
      "name": "Gradeability",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "PERF-006",
      "requirement_text": "The vehicle shall sustain 30 km/h on a 20 percent grade under nominal mass and battery conditions.",
      "documentation": "Rationale: Provides a measurable engineering target traceable to architecture, analysis, and verification. Acceptance: Vehicle sustains >= 30 km/h on a 20% grade for the specified duration."
    },
    {
      "op": "element",
      "external_id": "REQ_IF_001",
      "kind": "Requirement",
      "name": "High-Voltage Power Interface",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "IF-001",
      "requirement_text": "The EnergyStorageSystem-to-PowertrainSystem high-voltage interface shall provide compatible voltage, current, isolation, and connector typing for traction power transfer.",
      "documentation": "Rationale: Controls an explicit subsystem boundary and enables integration/change-impact analysis. Acceptance: Both interface ends use HighVoltagePowerInterface and the conveyed power item is compatible."
    },
    {
      "op": "element",
      "external_id": "REQ_IF_002",
      "kind": "Requirement",
      "name": "Torque Command Interface",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "IF-002",
      "requirement_text": "The VehicleControlSystem-to-PowertrainSystem torque-command interface shall convey a typed torque request without type mismatch.",
      "documentation": "Rationale: Controls an explicit subsystem boundary and enables integration/change-impact analysis. Acceptance: Both endpoints use TorqueCommandInterface and the ItemFlow conveys TorqueCommandData."
    },
    {
      "op": "element",
      "external_id": "REQ_IF_003",
      "kind": "Requirement",
      "name": "Sensor Data Interface",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "IF-003",
      "requirement_text": "The VehicleSensorSystem-to-VehicleControlSystem interface shall convey typed vehicle-state sensor data.",
      "documentation": "Rationale: Controls an explicit subsystem boundary and enables integration/change-impact analysis. Acceptance: Both endpoints use SensorDataInterface and the ItemFlow conveys SensorData."
    },
    {
      "op": "element",
      "external_id": "REQ_IF_004",
      "kind": "Requirement",
      "name": "Brake Command Interface",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "IF-004",
      "requirement_text": "The VehicleControlSystem-to-BrakeSystem interface shall convey a typed braking command.",
      "documentation": "Rationale: Controls an explicit subsystem boundary and enables integration/change-impact analysis. Acceptance: Both endpoints use BrakeCommandInterface and the ItemFlow conveys BrakeCommandData."
    },
    {
      "op": "element",
      "external_id": "REQ_IF_005",
      "kind": "Requirement",
      "name": "Thermal Interface",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "IF-005",
      "requirement_text": "The EnergyStorageSystem and PowertrainSystem shall exchange thermal energy/coolant through interfaces compatible with ThermalFluidInterface.",
      "documentation": "Rationale: Controls an explicit subsystem boundary and enables integration/change-impact analysis. Acceptance: Thermal connector endpoints use compatible ThermalFluidInterface typing."
    },
    {
      "op": "element",
      "external_id": "REQ_IF_006",
      "kind": "Requirement",
      "name": "Charging Power Interface",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "IF-006",
      "requirement_text": "The charging path shall use a typed ChargePowerInterface between vehicle boundary, ChargingSystem, and EnergyStorageSystem.",
      "documentation": "Rationale: Controls an explicit subsystem boundary and enables integration/change-impact analysis. Acceptance: Charge path endpoints use compatible ChargePowerInterface typing."
    },
    {
      "op": "element",
      "external_id": "REQ_IF_007",
      "kind": "Requirement",
      "name": "Diagnostic Service Interface",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "IF-007",
      "requirement_text": "The vehicle service boundary, ServiceDiagnosticsSystem, and VehicleControlSystem shall use a typed DiagnosticServiceInterface.",
      "documentation": "Rationale: Controls an explicit subsystem boundary and enables integration/change-impact analysis. Acceptance: Diagnostic connector endpoints use compatible DiagnosticServiceInterface typing."
    },
    {
      "op": "element",
      "external_id": "REQ_IF_008",
      "kind": "Requirement",
      "name": "Driver Command Interface",
      "owner": "handle:PKG_REQ_ENG",
      "requirement_id": "IF-008",
      "requirement_text": "The vehicle driver boundary, DriverInterfaceSystem, and VehicleControlSystem shall use a typed DriverCommandInterface.",
      "documentation": "Rationale: Controls an explicit subsystem boundary and enables integration/change-impact analysis. Acceptance: Driver-command connector endpoints use compatible DriverCommandInterface typing."
    },
    {
      "op": "element",
      "external_id": "REQ_PT_001",
      "kind": "Requirement",
      "name": "Torque Conversion",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "PT-001",
      "requirement_text": "The PowertrainSystem shall convert supplied high-voltage electrical power into commanded traction torque at the motor output.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Measured motor/wheel torque follows valid command."
    },
    {
      "op": "element",
      "external_id": "REQ_PT_002",
      "kind": "Requirement",
      "name": "Power Conversion Efficiency",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "PT-002",
      "requirement_text": "The traction inverter shall achieve at least 95 percent conversion efficiency at the nominal analysis point.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Inverter conversion efficiency is >= 95%."
    },
    {
      "op": "element",
      "external_id": "REQ_PT_003",
      "kind": "Requirement",
      "name": "Torque Command Response",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "PT-003",
      "requirement_text": "The PowertrainSystem shall begin responding to a new valid torque command within 20 ms.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Torque response begins <= 20 ms after command receipt."
    },
    {
      "op": "element",
      "external_id": "REQ_PT_004",
      "kind": "Requirement",
      "name": "Fault Torque Limiting",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "PT-004",
      "requirement_text": "The PowertrainSystem shall limit or remove propulsion torque after receipt of a confirmed critical propulsion fault.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Critical propulsion fault results in defined torque limit/removal."
    },
    {
      "op": "element",
      "external_id": "REQ_BAT_001",
      "kind": "Requirement",
      "name": "Usable Battery Energy",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "BAT-001",
      "requirement_text": "The EnergyStorageSystem shall provide at least 82 kWh of usable battery energy at beginning of life.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Usable battery energy is >= 82 kWh."
    },
    {
      "op": "element",
      "external_id": "REQ_BAT_002",
      "kind": "Requirement",
      "name": "State-of-Charge Estimation",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "BAT-002",
      "requirement_text": "The BatteryManagementSystem shall estimate state of charge with an error of no more than plus or minus 3 percentage points over the defined operating range.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: SOC estimate error is within +/-3 percentage points."
    },
    {
      "op": "element",
      "external_id": "REQ_BAT_003",
      "kind": "Requirement",
      "name": "Battery Protection",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "BAT-003",
      "requirement_text": "The BatteryManagementSystem shall inhibit operation outside defined cell voltage and temperature safety limits.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Out-of-limit stimulus causes protective inhibit/isolation behavior."
    },
    {
      "op": "element",
      "external_id": "REQ_BAT_004",
      "kind": "Requirement",
      "name": "Traction Power Capability",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "BAT-004",
      "requirement_text": "The EnergyStorageSystem shall supply at least 135 kW of traction electrical power for 10 seconds at the nominal performance test state of charge.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Delivered traction power is >= 135 kW for >= 10 s."
    },
    {
      "op": "element",
      "external_id": "REQ_BAT_005",
      "kind": "Requirement",
      "name": "Regenerative Charge Acceptance",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "BAT-005",
      "requirement_text": "The EnergyStorageSystem shall accept regenerative charging power when state-of-charge, voltage, and temperature limits permit.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Regenerative power is accepted under permitted conditions and limited outside them."
    },
    {
      "op": "element",
      "external_id": "REQ_CTRL_001",
      "kind": "Requirement",
      "name": "Drive Request Validation",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "CTRL-001",
      "requirement_text": "The VehicleControlSystem shall validate driver acceleration requests against vehicle state and active limits before issuing a torque command.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Invalid/out-of-range requests are rejected or limited before torque command publication."
    },
    {
      "op": "element",
      "external_id": "REQ_CTRL_002",
      "kind": "Requirement",
      "name": "Control Command Latency",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "CTRL-002",
      "requirement_text": "The VehicleControlSystem shall publish a validated torque command within 50 ms of receiving the required driver and vehicle-state inputs.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Validated torque command publication latency is <= 50 ms."
    },
    {
      "op": "element",
      "external_id": "REQ_CTRL_003",
      "kind": "Requirement",
      "name": "Fault Detection and Derating",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "CTRL-003",
      "requirement_text": "The VehicleControlSystem shall detect configured critical faults and command defined derating or fault-state behavior.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Configured fault produces the required derating/fault command."
    },
    {
      "op": "element",
      "external_id": "REQ_CTRL_004",
      "kind": "Requirement",
      "name": "Brake Coordination",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "CTRL-004",
      "requirement_text": "The VehicleControlSystem shall coordinate regenerative and friction braking requests while preserving the requested total deceleration within system limits.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Combined braking tracks requested deceleration within defined tolerance."
    },
    {
      "op": "element",
      "external_id": "REQ_BRK_001",
      "kind": "Requirement",
      "name": "Brake Command Response",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "BRK-001",
      "requirement_text": "The BrakeSystem shall begin producing commanded braking action within 100 ms of receiving a valid BrakeCommand.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Braking response begins <= 100 ms."
    },
    {
      "op": "element",
      "external_id": "REQ_BRK_002",
      "kind": "Requirement",
      "name": "Blended Braking",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "BRK-002",
      "requirement_text": "The BrakeSystem shall support blended regenerative and friction braking commands provided by vehicle control.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Blended braking maintains requested deceleration while using available regeneration."
    },
    {
      "op": "element",
      "external_id": "REQ_BRK_003",
      "kind": "Requirement",
      "name": "Fail-Safe Friction Braking",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "BRK-003",
      "requirement_text": "The BrakeSystem shall retain friction-braking capability when regenerative braking is unavailable.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Friction braking remains available with regenerative path disabled."
    },
    {
      "op": "element",
      "external_id": "REQ_THM_001",
      "kind": "Requirement",
      "name": "Battery Temperature Control",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "THM-001",
      "requirement_text": "The ThermalManagementSystem shall maintain battery temperature between 15 and 40 degrees Celsius during nominal propulsion and charging operation.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Battery temperature remains 15-40 C during nominal thermal test."
    },
    {
      "op": "element",
      "external_id": "REQ_THM_002",
      "kind": "Requirement",
      "name": "Power Electronics Cooling",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "THM-002",
      "requirement_text": "The ThermalManagementSystem shall maintain inverter and motor temperatures below their modeled operating limits during the nominal performance profile.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Inverter and motor temperatures remain below modeled limits."
    },
    {
      "op": "element",
      "external_id": "REQ_THM_003",
      "kind": "Requirement",
      "name": "Thermal Pump Control",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "THM-003",
      "requirement_text": "The ThermalController shall command coolant-pump operation as a function of modeled thermal load and component temperature.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Pump command changes consistently with thermal-load/temperature conditions."
    },
    {
      "op": "element",
      "external_id": "REQ_SNS_001",
      "kind": "Requirement",
      "name": "Vehicle Speed Accuracy",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "SNS-001",
      "requirement_text": "The VehicleSensorSystem shall estimate vehicle speed with an error no greater than plus or minus 1 km/h over the defined operating range.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Speed estimate error is within +/-1 km/h."
    },
    {
      "op": "element",
      "external_id": "REQ_SNS_002",
      "kind": "Requirement",
      "name": "Sensor Plausibility Detection",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "SNS-002",
      "requirement_text": "The VehicleSensorSystem shall identify configured implausible wheel-speed input conditions within 100 ms.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Configured implausible input is detected <= 100 ms."
    },
    {
      "op": "element",
      "external_id": "REQ_HMI_001",
      "kind": "Requirement",
      "name": "Driver Status Presentation",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "HMI-001",
      "requirement_text": "The DriverInterfaceSystem shall display Ready state, vehicle speed, battery state of charge, active drive mode, and safety-relevant faults.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: All required status items are visible and correspond to model/runtime state."
    },
    {
      "op": "element",
      "external_id": "REQ_HMI_002",
      "kind": "Requirement",
      "name": "Start Command Capture",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "HMI-002",
      "requirement_text": "The DriverInterfaceSystem shall capture a valid driver start request and provide it to VehicleControlSystem through the typed driver-command interface.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Valid start request produces a typed StartCommand input to vehicle control."
    },
    {
      "op": "element",
      "external_id": "REQ_CHG_001",
      "kind": "Requirement",
      "name": "DC Fast-Charge Coordination",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "CHG-001",
      "requirement_text": "The ChargingSystem shall coordinate a compatible DC fast-charge session and request charging power only when battery and vehicle-state prerequisites permit.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Charge session starts only when prerequisites are valid and is inhibited otherwise."
    },
    {
      "op": "element",
      "external_id": "REQ_SRV_001",
      "kind": "Requirement",
      "name": "Service Data Access",
      "owner": "handle:PKG_REQ_SUB",
      "requirement_id": "SRV-001",
      "requirement_text": "The ServiceDiagnosticsSystem shall provide authorized access to required DTCs and live telemetry through the typed diagnostic-service interface.",
      "documentation": "Rationale: Allocates a system-level requirement to an implementable subsystem or component. Acceptance: Authorized session reads required DTCs and telemetry; unauthorized session is rejected."
    },
    {
      "op": "element",
      "external_id": "VCOPY_STK_001",
      "kind": "Requirement",
      "name": "Verification Copy — Safe Controlled Transportation",
      "owner": "handle:PKG_VERIFY_VIEW",
      "requirement_id": "VER-STK-001",
      "requirement_text": "The electric vehicle shall provide controlled transportation and shall transition to a safe operating state when a critical vehicle fault is detected.",
      "documentation": "Verification-view copy of STK-001; authoritative master remains REQ_STK_001."
    },
    {
      "op": "element",
      "external_id": "VCOPY_STK_002",
      "kind": "Requirement",
      "name": "Verification Copy — Nominal Driving Range",
      "owner": "handle:PKG_VERIFY_VIEW",
      "requirement_id": "VER-STK-002",
      "requirement_text": "The electric vehicle shall provide at least 400 km of nominal driving range on a fully usable battery under the defined nominal drive cycle.",
      "documentation": "Verification-view copy of STK-002; authoritative master remains REQ_STK_002."
    },
    {
      "op": "element",
      "external_id": "VCOPY_SYS_001",
      "kind": "Requirement",
      "name": "Verification Copy — Commanded Startup",
      "owner": "handle:PKG_VERIFY_VIEW",
      "requirement_id": "VER-SYS-001",
      "requirement_text": "The vehicle shall enter the Ready state within 2.0 seconds after receiving a valid StartCommand when startup prerequisites are satisfied.",
      "documentation": "Verification-view copy of SYS-001; authoritative master remains REQ_SYS_001."
    },
    {
      "op": "element",
      "external_id": "VCOPY_SYS_002",
      "kind": "Requirement",
      "name": "Verification Copy — Propulsion Delivery",
      "owner": "handle:PKG_VERIFY_VIEW",
      "requirement_id": "VER-SYS-002",
      "requirement_text": "The vehicle shall deliver commanded positive and negative wheel torque within validated operating limits.",
      "documentation": "Verification-view copy of SYS-002; authoritative master remains REQ_SYS_002."
    },
    {
      "op": "element",
      "external_id": "VCOPY_SYS_004",
      "kind": "Requirement",
      "name": "Verification Copy — Controlled Braking",
      "owner": "handle:PKG_VERIFY_VIEW",
      "requirement_id": "VER-SYS-004",
      "requirement_text": "The vehicle shall initiate commanded braking within 100 ms of a valid driver or vehicle-control braking request.",
      "documentation": "Verification-view copy of SYS-004; authoritative master remains REQ_SYS_004."
    },
    {
      "op": "element",
      "external_id": "VCOPY_SYS_010",
      "kind": "Requirement",
      "name": "Verification Copy — High-Voltage Isolation",
      "owner": "handle:PKG_VERIFY_VIEW",
      "requirement_id": "VER-SYS-010",
      "requirement_text": "The vehicle shall open the high-voltage traction path when a confirmed isolation fault or crash isolation request is present.",
      "documentation": "Verification-view copy of SYS-010; authoritative master remains REQ_SYS_010."
    },
    {
      "op": "element",
      "external_id": "VCOPY_PERF_001",
      "kind": "Requirement",
      "name": "Verification Copy — Tractive Force",
      "owner": "handle:PKG_VERIFY_VIEW",
      "requirement_id": "VER-PERF-001",
      "requirement_text": "The propulsion system shall provide at least 4500 N of tractive force at the defined nominal launch analysis point.",
      "documentation": "Verification-view copy of PERF-001; authoritative master remains REQ_PERF_001."
    },
    {
      "op": "element",
      "external_id": "VCOPY_PERF_003",
      "kind": "Requirement",
      "name": "Verification Copy — Nominal Range Margin",
      "owner": "handle:PKG_VERIFY_VIEW",
      "requirement_id": "VER-PERF-003",
      "requirement_text": "The vehicle energy architecture shall analytically demonstrate at least 400 km of nominal range using usable battery energy and nominal consumption.",
      "documentation": "Verification-view copy of PERF-003; authoritative master remains REQ_PERF_003."
    },
    {
      "op": "element",
      "external_id": "TC_START",
      "kind": "TestCase",
      "name": "Commanded Startup Verification",
      "owner": "handle:PKG_VERIFY_VIEW",
      "documentation": "Method: Test. Verify valid-start sequencing, Ready transition, and startup timing."
    },
    {
      "op": "element",
      "external_id": "TC_SAFETY",
      "kind": "TestCase",
      "name": "Safety and High-Voltage Isolation",
      "owner": "handle:PKG_VERIFY_VIEW",
      "documentation": "Method: Test. Inject safety/HV faults and verify isolation plus safe-state behavior."
    },
    {
      "op": "element",
      "external_id": "TC_RANGE",
      "kind": "TestCase",
      "name": "Range and Energy Analysis",
      "owner": "handle:PKG_VERIFY_VIEW",
      "documentation": "Method: Analysis. Evaluate usable energy, consumption, and nominal range."
    },
    {
      "op": "element",
      "external_id": "TC_ACCEL",
      "kind": "TestCase",
      "name": "Acceleration / Force / Power Verification",
      "owner": "handle:PKG_VERIFY_VIEW",
      "documentation": "Method: Analysis. Evaluate tractive force and electrical power, then correlate to acceleration requirement."
    },
    {
      "op": "element",
      "external_id": "TC_CHARGE",
      "kind": "TestCase",
      "name": "Charging Performance Verification",
      "owner": "handle:PKG_VERIFY_VIEW",
      "documentation": "Method: Test. Verify charge prerequisites, charge-state behavior, and 10%-80% timing."
    },
    {
      "op": "element",
      "external_id": "TC_EFF",
      "kind": "TestCase",
      "name": "Energy Efficiency Analysis",
      "owner": "handle:PKG_VERIFY_ALL",
      "documentation": "Method: Analysis. Evaluate nominal energy consumption against <=0.20 kWh/km requirement."
    },
    {
      "op": "element",
      "external_id": "TC_HMI",
      "kind": "TestCase",
      "name": "Driver Interface Demonstration",
      "owner": "handle:PKG_VERIFY_ALL",
      "documentation": "Method: Demonstration. Demonstrate driver command capture and required status/fault indications."
    },
    {
      "op": "element",
      "external_id": "TC_DIAG",
      "kind": "TestCase",
      "name": "Diagnostics and Service Verification",
      "owner": "handle:PKG_VERIFY_ALL",
      "documentation": "Method: Test. Inject faults and verify authorized DTC/telemetry access."
    },
    {
      "op": "element",
      "external_id": "TC_DEGRADED",
      "kind": "TestCase",
      "name": "Degraded and Fault Management",
      "owner": "handle:PKG_VERIFY_ALL",
      "documentation": "Method: Test. Inject recoverable/critical faults and verify derating and state transitions."
    },
    {
      "op": "element",
      "external_id": "TC_BRAKE",
      "kind": "TestCase",
      "name": "Brake Performance Verification",
      "owner": "handle:PKG_VERIFY_VIEW",
      "documentation": "Method: Test. Verify response time, blended braking, and friction fallback."
    },
    {
      "op": "element",
      "external_id": "TC_THERMAL",
      "kind": "TestCase",
      "name": "Thermal Performance Verification",
      "owner": "handle:PKG_VERIFY_VIEW",
      "documentation": "Method: Test. Exercise propulsion/charging loads and verify component temperature control."
    },
    {
      "op": "element",
      "external_id": "TC_STATE",
      "kind": "TestCase",
      "name": "Vehicle State Estimation Verification",
      "owner": "handle:PKG_VERIFY_ALL",
      "documentation": "Method: Test. Verify speed/SOC accuracy and sensor plausibility detection."
    },
    {
      "op": "element",
      "external_id": "TC_INTERFACE",
      "kind": "TestCase",
      "name": "Typed Interface Compatibility",
      "owner": "handle:PKG_VERIFY_VIEW",
      "documentation": "Method: Inspection. Inspect every modeled connector and ItemFlow for path/type compatibility."
    },
    {
      "op": "element",
      "external_id": "TC_TOP_SPEED",
      "kind": "TestCase",
      "name": "Top-Speed Verification",
      "owner": "handle:PKG_VERIFY_ALL",
      "documentation": "Method: Test. Verify vehicle reaches >=160 km/h under nominal conditions."
    },
    {
      "op": "element",
      "external_id": "TC_GRADE",
      "kind": "TestCase",
      "name": "Gradeability Verification",
      "owner": "handle:PKG_VERIFY_ALL",
      "documentation": "Method: Test. Verify 30 km/h sustained speed on a 20% grade."
    },
    {
      "op": "element",
      "external_id": "TC_PT_RESPONSE",
      "kind": "TestCase",
      "name": "Powertrain Dynamic Response",
      "owner": "handle:PKG_VERIFY_ALL",
      "documentation": "Method: Test. Verify inverter efficiency and torque-response latency."
    },
    {
      "op": "element",
      "external_id": "TC_REGEN",
      "kind": "TestCase",
      "name": "Regenerative Braking Verification",
      "owner": "handle:PKG_VERIFY_ALL",
      "documentation": "Method: Test. Verify regen power acceptance and blended braking behavior."
    },
    {
      "op": "element",
      "external_id": "TC_CTRL",
      "kind": "TestCase",
      "name": "Control Validation and Latency",
      "owner": "handle:PKG_VERIFY_ALL",
      "documentation": "Method: Test. Verify drive-request validation and torque-command publication latency."
    },
    {
      "op": "element",
      "external_id": "VEH_SUBSYSTEM",
      "kind": "Block",
      "name": "VehicleSubsystem",
      "owner": "handle:PKG_ARCH",
      "documentation": "Abstract reusable type for primary vehicle subsystems."
    },
    {
      "op": "element",
      "external_id": "VEH",
      "kind": "Block",
      "name": "ElectricVehicle",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "POWERTRAIN",
      "kind": "Block",
      "name": "PowertrainSystem",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "ENERGY",
      "kind": "Block",
      "name": "EnergyStorageSystem",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "VCONTROL",
      "kind": "Block",
      "name": "VehicleControlSystem",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "BRAKES",
      "kind": "Block",
      "name": "BrakeSystem",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "THERMAL",
      "kind": "Block",
      "name": "ThermalManagementSystem",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "SENSORS",
      "kind": "Block",
      "name": "VehicleSensorSystem",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "HMI",
      "kind": "Block",
      "name": "DriverInterfaceSystem",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "CHARGE",
      "kind": "Block",
      "name": "ChargingSystem",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "DIAG",
      "kind": "Block",
      "name": "ServiceDiagnosticsSystem",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "relationship",
      "external_id": "GEN_POWERTRAIN",
      "kind": "Generalization",
      "source": "handle:POWERTRAIN",
      "target": "handle:VEH_SUBSYSTEM",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "relationship",
      "external_id": "GEN_ENERGY",
      "kind": "Generalization",
      "source": "handle:ENERGY",
      "target": "handle:VEH_SUBSYSTEM",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "relationship",
      "external_id": "GEN_VCONTROL",
      "kind": "Generalization",
      "source": "handle:VCONTROL",
      "target": "handle:VEH_SUBSYSTEM",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "relationship",
      "external_id": "GEN_BRAKES",
      "kind": "Generalization",
      "source": "handle:BRAKES",
      "target": "handle:VEH_SUBSYSTEM",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "relationship",
      "external_id": "GEN_THERMAL",
      "kind": "Generalization",
      "source": "handle:THERMAL",
      "target": "handle:VEH_SUBSYSTEM",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "relationship",
      "external_id": "GEN_SENSORS",
      "kind": "Generalization",
      "source": "handle:SENSORS",
      "target": "handle:VEH_SUBSYSTEM",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "relationship",
      "external_id": "GEN_HMI",
      "kind": "Generalization",
      "source": "handle:HMI",
      "target": "handle:VEH_SUBSYSTEM",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "relationship",
      "external_id": "GEN_CHARGE",
      "kind": "Generalization",
      "source": "handle:CHARGE",
      "target": "handle:VEH_SUBSYSTEM",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "relationship",
      "external_id": "GEN_DIAG",
      "kind": "Generalization",
      "source": "handle:DIAG",
      "target": "handle:VEH_SUBSYSTEM",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "element",
      "external_id": "INVERTER",
      "kind": "Block",
      "name": "TractionInverter",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "MOTOR",
      "kind": "Block",
      "name": "TractionMotor",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "BAT_MODULE",
      "kind": "Block",
      "name": "BatteryModule",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "BMS",
      "kind": "Block",
      "name": "BatteryManagementSystem",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "CHARGE_PORT",
      "kind": "Block",
      "name": "ChargePort",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "OBC",
      "kind": "Block",
      "name": "OnboardCharger",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "BRAKE_CTRL",
      "kind": "Block",
      "name": "BrakeController",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "BRAKE_ACT",
      "kind": "Block",
      "name": "BrakeActuator",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "THERM_CTRL",
      "kind": "Block",
      "name": "ThermalController",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "PUMP",
      "kind": "Block",
      "name": "CoolantPump",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "FUSION",
      "kind": "Block",
      "name": "SensorFusionController",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "WHEEL_SENSOR",
      "kind": "Block",
      "name": "WheelSpeedSensor",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "DIAG_GATEWAY",
      "kind": "Block",
      "name": "DiagnosticGateway",
      "owner": "handle:PKG_COMPONENTS"
    },
    {
      "op": "element",
      "external_id": "P_HMI",
      "kind": "PartProperty",
      "name": "driverInterface",
      "owner": "handle:VEH",
      "type_ref": "handle:HMI",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "P_VCONTROL",
      "kind": "PartProperty",
      "name": "vehicleControl",
      "owner": "handle:VEH",
      "type_ref": "handle:VCONTROL",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "P_POWERTRAIN",
      "kind": "PartProperty",
      "name": "powertrain",
      "owner": "handle:VEH",
      "type_ref": "handle:POWERTRAIN",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "P_SENSORS",
      "kind": "PartProperty",
      "name": "sensors",
      "owner": "handle:VEH",
      "type_ref": "handle:SENSORS",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "P_ENERGY",
      "kind": "PartProperty",
      "name": "energyStorage",
      "owner": "handle:VEH",
      "type_ref": "handle:ENERGY",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "P_BRAKES",
      "kind": "PartProperty",
      "name": "brakes",
      "owner": "handle:VEH",
      "type_ref": "handle:BRAKES",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "P_DIAG",
      "kind": "PartProperty",
      "name": "diagnostics",
      "owner": "handle:VEH",
      "type_ref": "handle:DIAG",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "P_CHARGE",
      "kind": "PartProperty",
      "name": "charging",
      "owner": "handle:VEH",
      "type_ref": "handle:CHARGE",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "P_THERMAL",
      "kind": "PartProperty",
      "name": "thermalManagement",
      "owner": "handle:VEH",
      "type_ref": "handle:THERMAL",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "PT_INV",
      "kind": "PartProperty",
      "name": "inverter",
      "owner": "handle:POWERTRAIN",
      "type_ref": "handle:INVERTER",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "PT_MOTOR",
      "kind": "PartProperty",
      "name": "tractionMotor",
      "owner": "handle:POWERTRAIN",
      "type_ref": "handle:MOTOR",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "ES_MODULE",
      "kind": "PartProperty",
      "name": "batteryModule",
      "owner": "handle:ENERGY",
      "type_ref": "handle:BAT_MODULE",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "ES_BMS",
      "kind": "PartProperty",
      "name": "bms",
      "owner": "handle:ENERGY",
      "type_ref": "handle:BMS",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "CH_PORT",
      "kind": "PartProperty",
      "name": "chargePort",
      "owner": "handle:CHARGE",
      "type_ref": "handle:CHARGE_PORT",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "CH_OBC",
      "kind": "PartProperty",
      "name": "onboardCharger",
      "owner": "handle:CHARGE",
      "type_ref": "handle:OBC",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "BR_CTRL",
      "kind": "PartProperty",
      "name": "controller",
      "owner": "handle:BRAKES",
      "type_ref": "handle:BRAKE_CTRL",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "BR_ACT",
      "kind": "PartProperty",
      "name": "actuator",
      "owner": "handle:BRAKES",
      "type_ref": "handle:BRAKE_ACT",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "TM_CTRL",
      "kind": "PartProperty",
      "name": "controller",
      "owner": "handle:THERMAL",
      "type_ref": "handle:THERM_CTRL",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "TM_PUMP",
      "kind": "PartProperty",
      "name": "coolantPump",
      "owner": "handle:THERMAL",
      "type_ref": "handle:PUMP",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "SN_FUSION",
      "kind": "PartProperty",
      "name": "fusionController",
      "owner": "handle:SENSORS",
      "type_ref": "handle:FUSION",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "SN_WHEEL",
      "kind": "PartProperty",
      "name": "wheelSpeedSensor",
      "owner": "handle:SENSORS",
      "type_ref": "handle:WHEEL_SENSOR",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "DG_GATEWAY",
      "kind": "PartProperty",
      "name": "gateway",
      "owner": "handle:DIAG",
      "type_ref": "handle:DIAG_GATEWAY",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "V_SOC",
      "kind": "ValueProperty",
      "name": "stateOfChargePercent",
      "owner": "handle:VEH",
      "type_ref": "handle:REAL",
      "default_value": "80"
    },
    {
      "op": "element",
      "external_id": "V_SPEED",
      "kind": "ValueProperty",
      "name": "vehicleSpeedKph",
      "owner": "handle:VEH",
      "type_ref": "handle:REAL",
      "default_value": "0"
    },
    {
      "op": "element",
      "external_id": "V_FAULT",
      "kind": "ValueProperty",
      "name": "faultActive",
      "owner": "handle:VEH",
      "type_ref": "handle:BOOL",
      "default_value": "false"
    },
    {
      "op": "element",
      "external_id": "OP_START",
      "kind": "Operation",
      "name": "startVehicle",
      "owner": "handle:VCONTROL"
    },
    {
      "op": "element",
      "external_id": "PAR_MODE",
      "kind": "Parameter",
      "name": "driveMode",
      "owner": "handle:OP_START",
      "type_ref": "handle:REAL",
      "parameter_direction": "In",
      "default_value": "1.0",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "OP_VALIDATE",
      "kind": "Operation",
      "name": "validateDriveRequest",
      "owner": "handle:VCONTROL"
    },
    {
      "op": "element",
      "external_id": "PAR_REQUEST",
      "kind": "Parameter",
      "name": "requestedAcceleration",
      "owner": "handle:OP_VALIDATE",
      "type_ref": "handle:REAL",
      "parameter_direction": "In",
      "default_value": "2.5",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "OP_TORQUE",
      "kind": "Operation",
      "name": "computeTorqueCommand",
      "owner": "handle:VCONTROL"
    },
    {
      "op": "element",
      "external_id": "PAR_TORQUE",
      "kind": "Parameter",
      "name": "accelerationRequest",
      "owner": "handle:OP_TORQUE",
      "type_ref": "handle:REAL",
      "parameter_direction": "In",
      "default_value": "2.5",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "OP_STOP",
      "kind": "Operation",
      "name": "stopVehicle",
      "owner": "handle:VCONTROL"
    },
    {
      "op": "element",
      "external_id": "OP_BRAKE",
      "kind": "Operation",
      "name": "applyBraking",
      "owner": "handle:BRAKES"
    },
    {
      "op": "element",
      "external_id": "OP_CHARGE",
      "kind": "Operation",
      "name": "beginChargeSession",
      "owner": "handle:CHARGE"
    },
    {
      "op": "element",
      "external_id": "SIG_START",
      "kind": "Signal",
      "name": "StartCommand",
      "owner": "handle:PKG_SIG"
    },
    {
      "op": "element",
      "external_id": "SIG_READY",
      "kind": "Signal",
      "name": "VehicleReady",
      "owner": "handle:PKG_SIG"
    },
    {
      "op": "element",
      "external_id": "SIG_STOP",
      "kind": "Signal",
      "name": "StopCommand",
      "owner": "handle:PKG_SIG"
    },
    {
      "op": "element",
      "external_id": "SIG_POWER_ENABLE",
      "kind": "Signal",
      "name": "PowerEnable",
      "owner": "handle:PKG_SIG"
    },
    {
      "op": "element",
      "external_id": "SIG_POWER_AVAILABLE",
      "kind": "Signal",
      "name": "PowerAvailable",
      "owner": "handle:PKG_SIG"
    },
    {
      "op": "element",
      "external_id": "SIG_TORQUE",
      "kind": "Signal",
      "name": "TorqueCommand",
      "owner": "handle:PKG_SIG"
    },
    {
      "op": "element",
      "external_id": "SIG_BRAKE",
      "kind": "Signal",
      "name": "BrakeCommand",
      "owner": "handle:PKG_SIG"
    },
    {
      "op": "element",
      "external_id": "SIG_CHARGE_REQ",
      "kind": "Signal",
      "name": "ChargeRequest",
      "owner": "handle:PKG_SIG"
    },
    {
      "op": "element",
      "external_id": "SIG_CHARGE_DONE",
      "kind": "Signal",
      "name": "ChargeComplete",
      "owner": "handle:PKG_SIG"
    },
    {
      "op": "element",
      "external_id": "SIG_FAULT",
      "kind": "Signal",
      "name": "FaultDetected",
      "owner": "handle:PKG_SIG"
    },
    {
      "op": "element",
      "external_id": "REC_START",
      "kind": "Reception",
      "name": "startCommand",
      "owner": "handle:VCONTROL",
      "type_ref": "handle:SIG_START"
    },
    {
      "op": "element",
      "external_id": "REC_STOP",
      "kind": "Reception",
      "name": "stopCommand",
      "owner": "handle:VCONTROL",
      "type_ref": "handle:SIG_STOP"
    },
    {
      "op": "element",
      "external_id": "REC_FAULT_CTRL",
      "kind": "Reception",
      "name": "faultDetected",
      "owner": "handle:VCONTROL",
      "type_ref": "handle:SIG_FAULT"
    },
    {
      "op": "element",
      "external_id": "REC_TORQUE",
      "kind": "Reception",
      "name": "torqueCommand",
      "owner": "handle:POWERTRAIN",
      "type_ref": "handle:SIG_TORQUE"
    },
    {
      "op": "element",
      "external_id": "REC_POWER",
      "kind": "Reception",
      "name": "powerEnable",
      "owner": "handle:ENERGY",
      "type_ref": "handle:SIG_POWER_ENABLE"
    },
    {
      "op": "element",
      "external_id": "REC_BRAKE",
      "kind": "Reception",
      "name": "brakeCommand",
      "owner": "handle:BRAKES",
      "type_ref": "handle:SIG_BRAKE"
    },
    {
      "op": "element",
      "external_id": "REC_CHARGE",
      "kind": "Reception",
      "name": "chargeRequest",
      "owner": "handle:CHARGE",
      "type_ref": "handle:SIG_CHARGE_REQ"
    },
    {
      "op": "element",
      "external_id": "VEH_DRIVER",
      "kind": "ProxyPort",
      "name": "driverCommand",
      "owner": "handle:VEH",
      "type_ref": "handle:IF_DRIVER"
    },
    {
      "op": "element",
      "external_id": "VEH_SERVICE",
      "kind": "FullPort",
      "name": "service",
      "owner": "handle:VEH",
      "type_ref": "handle:FULL_SERVICE_TYPE"
    },
    {
      "op": "element",
      "external_id": "VEH_CHARGE",
      "kind": "FullPort",
      "name": "charge",
      "owner": "handle:VEH",
      "type_ref": "handle:FULL_CHARGE_TYPE"
    },
    {
      "op": "element",
      "external_id": "HMI_DRIVER",
      "kind": "ProxyPort",
      "name": "driverIn",
      "owner": "handle:HMI",
      "type_ref": "handle:IF_DRIVER"
    },
    {
      "op": "element",
      "external_id": "HMI_CTRL",
      "kind": "ProxyPort",
      "name": "commandOut",
      "owner": "handle:HMI",
      "type_ref": "handle:IF_DRIVER"
    },
    {
      "op": "element",
      "external_id": "CTRL_DRIVER",
      "kind": "ProxyPort",
      "name": "driverCommandIn",
      "owner": "handle:VCONTROL",
      "type_ref": "handle:IF_DRIVER"
    },
    {
      "op": "element",
      "external_id": "CTRL_SENSOR",
      "kind": "ProxyPort",
      "name": "sensorDataIn",
      "owner": "handle:VCONTROL",
      "type_ref": "handle:IF_SENSOR"
    },
    {
      "op": "element",
      "external_id": "CTRL_TORQUE",
      "kind": "ProxyPort",
      "name": "torqueCommandOut",
      "owner": "handle:VCONTROL",
      "type_ref": "handle:IF_TORQUE"
    },
    {
      "op": "element",
      "external_id": "CTRL_BRAKE",
      "kind": "ProxyPort",
      "name": "brakeCommandOut",
      "owner": "handle:VCONTROL",
      "type_ref": "handle:IF_BRAKE"
    },
    {
      "op": "element",
      "external_id": "CTRL_DIAG",
      "kind": "ProxyPort",
      "name": "diagnosticPort",
      "owner": "handle:VCONTROL",
      "type_ref": "handle:IF_DIAG"
    },
    {
      "op": "element",
      "external_id": "SENS_DATA",
      "kind": "ProxyPort",
      "name": "sensorDataOut",
      "owner": "handle:SENSORS",
      "type_ref": "handle:IF_SENSOR"
    },
    {
      "op": "element",
      "external_id": "PT_TORQUE",
      "kind": "ProxyPort",
      "name": "torqueCommandIn",
      "owner": "handle:POWERTRAIN",
      "type_ref": "handle:IF_TORQUE"
    },
    {
      "op": "element",
      "external_id": "PT_HV",
      "kind": "ProxyPort",
      "name": "highVoltageIn",
      "owner": "handle:POWERTRAIN",
      "type_ref": "handle:IF_HV"
    },
    {
      "op": "element",
      "external_id": "ENERGY_HV",
      "kind": "ProxyPort",
      "name": "highVoltageOut",
      "owner": "handle:ENERGY",
      "type_ref": "handle:IF_HV"
    },
    {
      "op": "element",
      "external_id": "ENERGY_THERM",
      "kind": "ProxyPort",
      "name": "thermalPort",
      "owner": "handle:ENERGY",
      "type_ref": "handle:IF_THERMAL"
    },
    {
      "op": "element",
      "external_id": "ENERGY_CHARGE",
      "kind": "ProxyPort",
      "name": "chargePowerIn",
      "owner": "handle:ENERGY",
      "type_ref": "handle:IF_CHARGE"
    },
    {
      "op": "element",
      "external_id": "BRAKE_CMD",
      "kind": "ProxyPort",
      "name": "brakeCommandIn",
      "owner": "handle:BRAKES",
      "type_ref": "handle:IF_BRAKE"
    },
    {
      "op": "element",
      "external_id": "THERM_ENERGY",
      "kind": "ProxyPort",
      "name": "batteryThermalPort",
      "owner": "handle:THERMAL",
      "type_ref": "handle:IF_THERMAL"
    },
    {
      "op": "element",
      "external_id": "CHARGE_EXT",
      "kind": "FullPort",
      "name": "externalChargeIn",
      "owner": "handle:CHARGE",
      "type_ref": "handle:FULL_CHARGE_TYPE"
    },
    {
      "op": "element",
      "external_id": "CHARGE_OUT",
      "kind": "ProxyPort",
      "name": "chargePowerOut",
      "owner": "handle:CHARGE",
      "type_ref": "handle:IF_CHARGE"
    },
    {
      "op": "element",
      "external_id": "DIAG_SERVICE",
      "kind": "FullPort",
      "name": "serviceBoundary",
      "owner": "handle:DIAG",
      "type_ref": "handle:FULL_SERVICE_TYPE"
    },
    {
      "op": "element",
      "external_id": "DIAG_CTRL",
      "kind": "ProxyPort",
      "name": "controllerDiagnostic",
      "owner": "handle:DIAG",
      "type_ref": "handle:IF_DIAG"
    },
    {
      "op": "element",
      "external_id": "INV_HV",
      "kind": "ProxyPort",
      "name": "highVoltageIn",
      "owner": "handle:INVERTER",
      "type_ref": "handle:IF_HV"
    },
    {
      "op": "element",
      "external_id": "INV_CMD",
      "kind": "ProxyPort",
      "name": "torqueCommandIn",
      "owner": "handle:INVERTER",
      "type_ref": "handle:IF_TORQUE"
    },
    {
      "op": "element",
      "external_id": "INV_MOTOR",
      "kind": "ProxyPort",
      "name": "motorPowerOut",
      "owner": "handle:INVERTER",
      "type_ref": "handle:IF_MOTOR"
    },
    {
      "op": "element",
      "external_id": "MOTOR_POWER",
      "kind": "ProxyPort",
      "name": "motorPowerIn",
      "owner": "handle:MOTOR",
      "type_ref": "handle:IF_MOTOR"
    },
    {
      "op": "element",
      "external_id": "FLEET",
      "kind": "Block",
      "name": "Fleet",
      "owner": "handle:PKG_CONFIG"
    },
    {
      "op": "element",
      "external_id": "P_VEHA",
      "kind": "PartProperty",
      "name": "vehicleA",
      "owner": "handle:FLEET",
      "type_ref": "handle:VEH",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "P_VEHB",
      "kind": "PartProperty",
      "name": "vehicleB",
      "owner": "handle:FLEET",
      "type_ref": "handle:VEH",
      "multiplicity": {
        "lower": 1,
        "upper": 1
      }
    },
    {
      "op": "element",
      "external_id": "DRIVER",
      "kind": "Actor",
      "name": "Driver",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "element",
      "external_id": "TECH",
      "kind": "Actor",
      "name": "ServiceTechnician",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "element",
      "external_id": "STATION",
      "kind": "Actor",
      "name": "ChargingStation",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "element",
      "external_id": "UC_OPERATE",
      "kind": "UseCase",
      "name": "Operate Vehicle",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "element",
      "external_id": "UC_START",
      "kind": "UseCase",
      "name": "Start Vehicle",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "element",
      "external_id": "UC_DRIVE",
      "kind": "UseCase",
      "name": "Drive Vehicle",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "element",
      "external_id": "UC_BRAKE",
      "kind": "UseCase",
      "name": "Brake Vehicle",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "element",
      "external_id": "UC_CHARGE",
      "kind": "UseCase",
      "name": "Charge Vehicle",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "element",
      "external_id": "UC_DIAG",
      "kind": "UseCase",
      "name": "Diagnose Vehicle",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "element",
      "external_id": "UC_EMERGENCY",
      "kind": "UseCase",
      "name": "Emergency Stop",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "PKG_IMPORT_COMMON",
      "kind": "PackageImport",
      "source": "handle:PKG_ARCH",
      "target": "handle:PKG_COMMON",
      "owner": "handle:PKG_ARCH"
    },
    {
      "op": "relationship",
      "external_id": "PKG_DEP_BEHAV_ARCH",
      "kind": "Dependency",
      "source": "handle:PKG_BEHAV",
      "target": "handle:PKG_ARCH",
      "owner": "handle:PKG"
    },
    {
      "op": "relationship",
      "external_id": "PKG_DEP_ANALYSIS_ARCH",
      "kind": "Dependency",
      "source": "handle:PKG_ANALYSIS",
      "target": "handle:PKG_ARCH",
      "owner": "handle:PKG"
    },
    {
      "op": "relationship",
      "external_id": "PKG_DEP_UC_REQ",
      "kind": "Dependency",
      "source": "handle:PKG_UC",
      "target": "handle:PKG_REQ",
      "owner": "handle:PKG"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_001",
      "target": "handle:REQ_STK_006",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_002",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_002",
      "target": "handle:REQ_STK_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_003",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_003",
      "target": "handle:REQ_STK_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_004",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_004",
      "target": "handle:REQ_STK_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_005",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_005",
      "target": "handle:REQ_STK_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_006",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_006",
      "target": "handle:REQ_STK_008",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_007",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_007",
      "target": "handle:REQ_STK_006",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_008",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_008",
      "target": "handle:REQ_STK_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_009",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_009",
      "target": "handle:REQ_STK_007",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_010",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_010",
      "target": "handle:REQ_STK_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_011",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_011",
      "target": "handle:REQ_STK_008",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SYS_012",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SYS_012",
      "target": "handle:REQ_STK_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_PERF_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_PERF_001",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_PERF_002",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_PERF_002",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_PERF_003",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_PERF_003",
      "target": "handle:REQ_SYS_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_PERF_004",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_PERF_004",
      "target": "handle:REQ_SYS_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_PERF_005",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_PERF_005",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_PERF_006",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_PERF_006",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_IF_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_IF_001",
      "target": "handle:REQ_SYS_012",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_IF_002",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_IF_002",
      "target": "handle:REQ_SYS_012",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_IF_003",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_IF_003",
      "target": "handle:REQ_SYS_012",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_IF_004",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_IF_004",
      "target": "handle:REQ_SYS_012",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_IF_005",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_IF_005",
      "target": "handle:REQ_SYS_012",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_IF_006",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_IF_006",
      "target": "handle:REQ_SYS_012",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_IF_007",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_IF_007",
      "target": "handle:REQ_SYS_012",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_IF_008",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_IF_008",
      "target": "handle:REQ_SYS_012",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_PT_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_PT_001",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_PT_002",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_PT_002",
      "target": "handle:REQ_PERF_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_PT_003",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_PT_003",
      "target": "handle:REQ_IF_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_PT_004",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_PT_004",
      "target": "handle:REQ_SYS_011",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_BAT_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_BAT_001",
      "target": "handle:REQ_SYS_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_BAT_002",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_BAT_002",
      "target": "handle:REQ_SYS_006",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_BAT_003",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_BAT_003",
      "target": "handle:REQ_SYS_011",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_BAT_004",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_BAT_004",
      "target": "handle:REQ_PERF_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_BAT_005",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_BAT_005",
      "target": "handle:REQ_PERF_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_CTRL_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_CTRL_001",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_CTRL_002",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_CTRL_002",
      "target": "handle:REQ_IF_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_CTRL_003",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_CTRL_003",
      "target": "handle:REQ_SYS_011",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_CTRL_004",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_CTRL_004",
      "target": "handle:REQ_SYS_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_BRK_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_BRK_001",
      "target": "handle:REQ_SYS_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_BRK_002",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_BRK_002",
      "target": "handle:REQ_PERF_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_BRK_003",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_BRK_003",
      "target": "handle:REQ_SYS_011",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_THM_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_THM_001",
      "target": "handle:REQ_SYS_005",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_THM_002",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_THM_002",
      "target": "handle:REQ_SYS_005",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_THM_003",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_THM_003",
      "target": "handle:REQ_SYS_005",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SNS_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SNS_001",
      "target": "handle:REQ_SYS_006",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SNS_002",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SNS_002",
      "target": "handle:REQ_SYS_011",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_HMI_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_HMI_001",
      "target": "handle:REQ_SYS_007",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_HMI_002",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_HMI_002",
      "target": "handle:REQ_SYS_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_CHG_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_CHG_001",
      "target": "handle:REQ_SYS_008",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "DER_SRV_001",
      "kind": "DeriveRequirement",
      "source": "handle:REQ_SRV_001",
      "target": "handle:REQ_SYS_009",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_STK_001_1",
      "kind": "Satisfy",
      "source": "handle:VEH",
      "target": "handle:REQ_STK_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_STK_002_1",
      "kind": "Satisfy",
      "source": "handle:VEH",
      "target": "handle:REQ_STK_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_STK_003_1",
      "kind": "Satisfy",
      "source": "handle:VEH",
      "target": "handle:REQ_STK_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_STK_004_1",
      "kind": "Satisfy",
      "source": "handle:CHARGE",
      "target": "handle:REQ_STK_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_STK_005_1",
      "kind": "Satisfy",
      "source": "handle:VEH",
      "target": "handle:REQ_STK_005",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_STK_006_1",
      "kind": "Satisfy",
      "source": "handle:HMI",
      "target": "handle:REQ_STK_006",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_STK_007_1",
      "kind": "Satisfy",
      "source": "handle:DIAG",
      "target": "handle:REQ_STK_007",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_STK_008_1",
      "kind": "Satisfy",
      "source": "handle:VEH",
      "target": "handle:REQ_STK_008",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_001_1",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_SYS_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_002_1",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_003_1",
      "kind": "Satisfy",
      "source": "handle:ENERGY",
      "target": "handle:REQ_SYS_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_004_1",
      "kind": "Satisfy",
      "source": "handle:BRAKES",
      "target": "handle:REQ_SYS_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_005_1",
      "kind": "Satisfy",
      "source": "handle:THERMAL",
      "target": "handle:REQ_SYS_005",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_006_1",
      "kind": "Satisfy",
      "source": "handle:SENSORS",
      "target": "handle:REQ_SYS_006",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_007_1",
      "kind": "Satisfy",
      "source": "handle:HMI",
      "target": "handle:REQ_SYS_007",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_008_1",
      "kind": "Satisfy",
      "source": "handle:CHARGE",
      "target": "handle:REQ_SYS_008",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_009_1",
      "kind": "Satisfy",
      "source": "handle:DIAG",
      "target": "handle:REQ_SYS_009",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_010_1",
      "kind": "Satisfy",
      "source": "handle:ENERGY",
      "target": "handle:REQ_SYS_010",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_011_1",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_SYS_011",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SYS_012_1",
      "kind": "Satisfy",
      "source": "handle:VEH",
      "target": "handle:REQ_SYS_012",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PERF_001_1",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_PERF_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PERF_002_1",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_PERF_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PERF_003_1",
      "kind": "Satisfy",
      "source": "handle:VEH",
      "target": "handle:REQ_PERF_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PERF_004_1",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_PERF_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PERF_004_2",
      "kind": "Satisfy",
      "source": "handle:ENERGY",
      "target": "handle:REQ_PERF_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PERF_005_1",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_PERF_005",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PERF_006_1",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_PERF_006",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_001_1",
      "kind": "Satisfy",
      "source": "handle:ENERGY",
      "target": "handle:REQ_IF_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_001_2",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_IF_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_002_1",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_IF_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_002_2",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_IF_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_003_1",
      "kind": "Satisfy",
      "source": "handle:SENSORS",
      "target": "handle:REQ_IF_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_003_2",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_IF_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_004_1",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_IF_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_004_2",
      "kind": "Satisfy",
      "source": "handle:BRAKES",
      "target": "handle:REQ_IF_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_005_1",
      "kind": "Satisfy",
      "source": "handle:ENERGY",
      "target": "handle:REQ_IF_005",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_005_2",
      "kind": "Satisfy",
      "source": "handle:THERMAL",
      "target": "handle:REQ_IF_005",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_006_1",
      "kind": "Satisfy",
      "source": "handle:CHARGE",
      "target": "handle:REQ_IF_006",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_006_2",
      "kind": "Satisfy",
      "source": "handle:ENERGY",
      "target": "handle:REQ_IF_006",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_007_1",
      "kind": "Satisfy",
      "source": "handle:DIAG",
      "target": "handle:REQ_IF_007",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_007_2",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_IF_007",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_008_1",
      "kind": "Satisfy",
      "source": "handle:HMI",
      "target": "handle:REQ_IF_008",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_IF_008_2",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_IF_008",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PT_001_1",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_PT_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PT_002_1",
      "kind": "Satisfy",
      "source": "handle:INVERTER",
      "target": "handle:REQ_PT_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PT_003_1",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_PT_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_PT_004_1",
      "kind": "Satisfy",
      "source": "handle:POWERTRAIN",
      "target": "handle:REQ_PT_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_BAT_001_1",
      "kind": "Satisfy",
      "source": "handle:ENERGY",
      "target": "handle:REQ_BAT_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_BAT_002_1",
      "kind": "Satisfy",
      "source": "handle:BMS",
      "target": "handle:REQ_BAT_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_BAT_003_1",
      "kind": "Satisfy",
      "source": "handle:BMS",
      "target": "handle:REQ_BAT_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_BAT_004_1",
      "kind": "Satisfy",
      "source": "handle:ENERGY",
      "target": "handle:REQ_BAT_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_BAT_005_1",
      "kind": "Satisfy",
      "source": "handle:ENERGY",
      "target": "handle:REQ_BAT_005",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_CTRL_001_1",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_CTRL_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_CTRL_002_1",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_CTRL_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_CTRL_003_1",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_CTRL_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_CTRL_004_1",
      "kind": "Satisfy",
      "source": "handle:VCONTROL",
      "target": "handle:REQ_CTRL_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_BRK_001_1",
      "kind": "Satisfy",
      "source": "handle:BRAKES",
      "target": "handle:REQ_BRK_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_BRK_002_1",
      "kind": "Satisfy",
      "source": "handle:BRAKES",
      "target": "handle:REQ_BRK_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_BRK_003_1",
      "kind": "Satisfy",
      "source": "handle:BRAKES",
      "target": "handle:REQ_BRK_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_THM_001_1",
      "kind": "Satisfy",
      "source": "handle:THERMAL",
      "target": "handle:REQ_THM_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_THM_002_1",
      "kind": "Satisfy",
      "source": "handle:THERMAL",
      "target": "handle:REQ_THM_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_THM_003_1",
      "kind": "Satisfy",
      "source": "handle:THERM_CTRL",
      "target": "handle:REQ_THM_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SNS_001_1",
      "kind": "Satisfy",
      "source": "handle:SENSORS",
      "target": "handle:REQ_SNS_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SNS_002_1",
      "kind": "Satisfy",
      "source": "handle:SENSORS",
      "target": "handle:REQ_SNS_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_HMI_001_1",
      "kind": "Satisfy",
      "source": "handle:HMI",
      "target": "handle:REQ_HMI_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_HMI_002_1",
      "kind": "Satisfy",
      "source": "handle:HMI",
      "target": "handle:REQ_HMI_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_CHG_001_1",
      "kind": "Satisfy",
      "source": "handle:CHARGE",
      "target": "handle:REQ_CHG_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "SAT_SRV_001_1",
      "kind": "Satisfy",
      "source": "handle:DIAG",
      "target": "handle:REQ_SRV_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "VER_STK_001",
      "kind": "Verify",
      "source": "handle:TC_SAFETY",
      "target": "handle:REQ_STK_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_STK_002",
      "kind": "Verify",
      "source": "handle:TC_RANGE",
      "target": "handle:REQ_STK_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_STK_003",
      "kind": "Verify",
      "source": "handle:TC_ACCEL",
      "target": "handle:REQ_STK_003",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_STK_004",
      "kind": "Verify",
      "source": "handle:TC_CHARGE",
      "target": "handle:REQ_STK_004",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_STK_005",
      "kind": "Verify",
      "source": "handle:TC_EFF",
      "target": "handle:REQ_STK_005",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_STK_006",
      "kind": "Verify",
      "source": "handle:TC_HMI",
      "target": "handle:REQ_STK_006",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_STK_007",
      "kind": "Verify",
      "source": "handle:TC_DIAG",
      "target": "handle:REQ_STK_007",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_STK_008",
      "kind": "Verify",
      "source": "handle:TC_DEGRADED",
      "target": "handle:REQ_STK_008",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_001",
      "kind": "Verify",
      "source": "handle:TC_START",
      "target": "handle:REQ_SYS_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_002",
      "kind": "Verify",
      "source": "handle:TC_ACCEL",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_003",
      "kind": "Verify",
      "source": "handle:TC_RANGE",
      "target": "handle:REQ_SYS_003",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_004",
      "kind": "Verify",
      "source": "handle:TC_BRAKE",
      "target": "handle:REQ_SYS_004",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_005",
      "kind": "Verify",
      "source": "handle:TC_THERMAL",
      "target": "handle:REQ_SYS_005",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_006",
      "kind": "Verify",
      "source": "handle:TC_STATE",
      "target": "handle:REQ_SYS_006",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_007",
      "kind": "Verify",
      "source": "handle:TC_HMI",
      "target": "handle:REQ_SYS_007",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_008",
      "kind": "Verify",
      "source": "handle:TC_CHARGE",
      "target": "handle:REQ_SYS_008",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_009",
      "kind": "Verify",
      "source": "handle:TC_DIAG",
      "target": "handle:REQ_SYS_009",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_010",
      "kind": "Verify",
      "source": "handle:TC_SAFETY",
      "target": "handle:REQ_SYS_010",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_011",
      "kind": "Verify",
      "source": "handle:TC_DEGRADED",
      "target": "handle:REQ_SYS_011",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SYS_012",
      "kind": "Verify",
      "source": "handle:TC_INTERFACE",
      "target": "handle:REQ_SYS_012",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_PERF_001",
      "kind": "Verify",
      "source": "handle:TC_ACCEL",
      "target": "handle:REQ_PERF_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_PERF_002",
      "kind": "Verify",
      "source": "handle:TC_ACCEL",
      "target": "handle:REQ_PERF_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_PERF_003",
      "kind": "Verify",
      "source": "handle:TC_RANGE",
      "target": "handle:REQ_PERF_003",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_PERF_004",
      "kind": "Verify",
      "source": "handle:TC_REGEN",
      "target": "handle:REQ_PERF_004",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_PERF_005",
      "kind": "Verify",
      "source": "handle:TC_TOP_SPEED",
      "target": "handle:REQ_PERF_005",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_PERF_006",
      "kind": "Verify",
      "source": "handle:TC_GRADE",
      "target": "handle:REQ_PERF_006",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_IF_001",
      "kind": "Verify",
      "source": "handle:TC_INTERFACE",
      "target": "handle:REQ_IF_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_IF_002",
      "kind": "Verify",
      "source": "handle:TC_INTERFACE",
      "target": "handle:REQ_IF_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_IF_003",
      "kind": "Verify",
      "source": "handle:TC_INTERFACE",
      "target": "handle:REQ_IF_003",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_IF_004",
      "kind": "Verify",
      "source": "handle:TC_INTERFACE",
      "target": "handle:REQ_IF_004",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_IF_005",
      "kind": "Verify",
      "source": "handle:TC_THERMAL",
      "target": "handle:REQ_IF_005",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_IF_006",
      "kind": "Verify",
      "source": "handle:TC_CHARGE",
      "target": "handle:REQ_IF_006",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_IF_007",
      "kind": "Verify",
      "source": "handle:TC_DIAG",
      "target": "handle:REQ_IF_007",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_IF_008",
      "kind": "Verify",
      "source": "handle:TC_HMI",
      "target": "handle:REQ_IF_008",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_PT_001",
      "kind": "Verify",
      "source": "handle:TC_ACCEL",
      "target": "handle:REQ_PT_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_PT_002",
      "kind": "Verify",
      "source": "handle:TC_PT_RESPONSE",
      "target": "handle:REQ_PT_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_PT_003",
      "kind": "Verify",
      "source": "handle:TC_PT_RESPONSE",
      "target": "handle:REQ_PT_003",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_PT_004",
      "kind": "Verify",
      "source": "handle:TC_DEGRADED",
      "target": "handle:REQ_PT_004",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_BAT_001",
      "kind": "Verify",
      "source": "handle:TC_RANGE",
      "target": "handle:REQ_BAT_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_BAT_002",
      "kind": "Verify",
      "source": "handle:TC_STATE",
      "target": "handle:REQ_BAT_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_BAT_003",
      "kind": "Verify",
      "source": "handle:TC_SAFETY",
      "target": "handle:REQ_BAT_003",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_BAT_004",
      "kind": "Verify",
      "source": "handle:TC_ACCEL",
      "target": "handle:REQ_BAT_004",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_BAT_005",
      "kind": "Verify",
      "source": "handle:TC_REGEN",
      "target": "handle:REQ_BAT_005",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_CTRL_001",
      "kind": "Verify",
      "source": "handle:TC_CTRL",
      "target": "handle:REQ_CTRL_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_CTRL_002",
      "kind": "Verify",
      "source": "handle:TC_CTRL",
      "target": "handle:REQ_CTRL_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_CTRL_003",
      "kind": "Verify",
      "source": "handle:TC_DEGRADED",
      "target": "handle:REQ_CTRL_003",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_CTRL_004",
      "kind": "Verify",
      "source": "handle:TC_BRAKE",
      "target": "handle:REQ_CTRL_004",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_BRK_001",
      "kind": "Verify",
      "source": "handle:TC_BRAKE",
      "target": "handle:REQ_BRK_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_BRK_002",
      "kind": "Verify",
      "source": "handle:TC_REGEN",
      "target": "handle:REQ_BRK_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_BRK_003",
      "kind": "Verify",
      "source": "handle:TC_BRAKE",
      "target": "handle:REQ_BRK_003",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_THM_001",
      "kind": "Verify",
      "source": "handle:TC_THERMAL",
      "target": "handle:REQ_THM_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_THM_002",
      "kind": "Verify",
      "source": "handle:TC_THERMAL",
      "target": "handle:REQ_THM_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_THM_003",
      "kind": "Verify",
      "source": "handle:TC_THERMAL",
      "target": "handle:REQ_THM_003",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SNS_001",
      "kind": "Verify",
      "source": "handle:TC_STATE",
      "target": "handle:REQ_SNS_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SNS_002",
      "kind": "Verify",
      "source": "handle:TC_STATE",
      "target": "handle:REQ_SNS_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_HMI_001",
      "kind": "Verify",
      "source": "handle:TC_HMI",
      "target": "handle:REQ_HMI_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_HMI_002",
      "kind": "Verify",
      "source": "handle:TC_START",
      "target": "handle:REQ_HMI_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_CHG_001",
      "kind": "Verify",
      "source": "handle:TC_CHARGE",
      "target": "handle:REQ_CHG_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VER_SRV_001",
      "kind": "Verify",
      "source": "handle:TC_DIAG",
      "target": "handle:REQ_SRV_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "COPY_VCOPY_STK_001",
      "kind": "Copy",
      "source": "handle:VCOPY_STK_001",
      "target": "handle:REQ_STK_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VERCOPY_VCOPY_STK_001",
      "kind": "Verify",
      "source": "handle:TC_SAFETY",
      "target": "handle:VCOPY_STK_001",
      "owner": "handle:PKG_VERIFY_VIEW"
    },
    {
      "op": "relationship",
      "external_id": "COPY_VCOPY_STK_002",
      "kind": "Copy",
      "source": "handle:VCOPY_STK_002",
      "target": "handle:REQ_STK_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VERCOPY_VCOPY_STK_002",
      "kind": "Verify",
      "source": "handle:TC_RANGE",
      "target": "handle:VCOPY_STK_002",
      "owner": "handle:PKG_VERIFY_VIEW"
    },
    {
      "op": "relationship",
      "external_id": "COPY_VCOPY_SYS_001",
      "kind": "Copy",
      "source": "handle:VCOPY_SYS_001",
      "target": "handle:REQ_SYS_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VERCOPY_VCOPY_SYS_001",
      "kind": "Verify",
      "source": "handle:TC_START",
      "target": "handle:VCOPY_SYS_001",
      "owner": "handle:PKG_VERIFY_VIEW"
    },
    {
      "op": "relationship",
      "external_id": "COPY_VCOPY_SYS_002",
      "kind": "Copy",
      "source": "handle:VCOPY_SYS_002",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VERCOPY_VCOPY_SYS_002",
      "kind": "Verify",
      "source": "handle:TC_ACCEL",
      "target": "handle:VCOPY_SYS_002",
      "owner": "handle:PKG_VERIFY_VIEW"
    },
    {
      "op": "relationship",
      "external_id": "COPY_VCOPY_SYS_004",
      "kind": "Copy",
      "source": "handle:VCOPY_SYS_004",
      "target": "handle:REQ_SYS_004",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VERCOPY_VCOPY_SYS_004",
      "kind": "Verify",
      "source": "handle:TC_BRAKE",
      "target": "handle:VCOPY_SYS_004",
      "owner": "handle:PKG_VERIFY_VIEW"
    },
    {
      "op": "relationship",
      "external_id": "COPY_VCOPY_SYS_010",
      "kind": "Copy",
      "source": "handle:VCOPY_SYS_010",
      "target": "handle:REQ_SYS_010",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VERCOPY_VCOPY_SYS_010",
      "kind": "Verify",
      "source": "handle:TC_SAFETY",
      "target": "handle:VCOPY_SYS_010",
      "owner": "handle:PKG_VERIFY_VIEW"
    },
    {
      "op": "relationship",
      "external_id": "COPY_VCOPY_PERF_001",
      "kind": "Copy",
      "source": "handle:VCOPY_PERF_001",
      "target": "handle:REQ_PERF_001",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VERCOPY_VCOPY_PERF_001",
      "kind": "Verify",
      "source": "handle:TC_ACCEL",
      "target": "handle:VCOPY_PERF_001",
      "owner": "handle:PKG_VERIFY_VIEW"
    },
    {
      "op": "relationship",
      "external_id": "COPY_VCOPY_PERF_003",
      "kind": "Copy",
      "source": "handle:VCOPY_PERF_003",
      "target": "handle:REQ_PERF_003",
      "owner": "handle:PKG_VERIFY"
    },
    {
      "op": "relationship",
      "external_id": "VERCOPY_VCOPY_PERF_003",
      "kind": "Verify",
      "source": "handle:TC_RANGE",
      "target": "handle:VCOPY_PERF_003",
      "owner": "handle:PKG_VERIFY_VIEW"
    },
    {
      "op": "relationship",
      "external_id": "UC_A_DRIVER",
      "kind": "Association",
      "source": "handle:DRIVER",
      "target": "handle:UC_OPERATE",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "UC_A_DRIVER_CHARGE",
      "kind": "Association",
      "source": "handle:DRIVER",
      "target": "handle:UC_CHARGE",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "UC_A_TECH",
      "kind": "Association",
      "source": "handle:TECH",
      "target": "handle:UC_DIAG",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "UC_A_STATION",
      "kind": "Association",
      "source": "handle:STATION",
      "target": "handle:UC_CHARGE",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "UC_INC_START",
      "kind": "Include",
      "source": "handle:UC_OPERATE",
      "target": "handle:UC_START",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "UC_INC_DRIVE",
      "kind": "Include",
      "source": "handle:UC_OPERATE",
      "target": "handle:UC_DRIVE",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "UC_INC_BRAKE",
      "kind": "Include",
      "source": "handle:UC_OPERATE",
      "target": "handle:UC_BRAKE",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "UC_EXT_EMERG",
      "kind": "Extend",
      "source": "handle:UC_EMERGENCY",
      "target": "handle:UC_DRIVE",
      "owner": "handle:PKG_UC",
      "extension_condition": "critical safety event"
    },
    {
      "op": "relationship",
      "external_id": "TRACE_START",
      "kind": "Trace",
      "source": "handle:UC_START",
      "target": "handle:REQ_SYS_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "TRACE_DRIVE",
      "kind": "Trace",
      "source": "handle:UC_DRIVE",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "TRACE_BRAKE",
      "kind": "Trace",
      "source": "handle:UC_BRAKE",
      "target": "handle:REQ_SYS_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "TRACE_CHARGE",
      "kind": "Trace",
      "source": "handle:UC_CHARGE",
      "target": "handle:REQ_SYS_008",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "TRACE_DIAG",
      "kind": "Trace",
      "source": "handle:UC_DIAG",
      "target": "handle:REQ_SYS_009",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "TRACE_EMERG",
      "kind": "Trace",
      "source": "handle:UC_EMERGENCY",
      "target": "handle:REQ_STK_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "ALLOC_OPERATE",
      "kind": "Allocate",
      "source": "handle:UC_OPERATE",
      "target": "handle:VCONTROL",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "ALLOC_DRIVE",
      "kind": "Allocate",
      "source": "handle:UC_DRIVE",
      "target": "handle:VCONTROL",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "ALLOC_BRAKE",
      "kind": "Allocate",
      "source": "handle:UC_BRAKE",
      "target": "handle:BRAKES",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "ALLOC_CHARGE",
      "kind": "Allocate",
      "source": "handle:UC_CHARGE",
      "target": "handle:CHARGE",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "relationship",
      "external_id": "ALLOC_DIAG",
      "kind": "Allocate",
      "source": "handle:UC_DIAG",
      "target": "handle:DIAG",
      "owner": "handle:PKG_UC"
    },
    {
      "op": "connector",
      "external_id": "CONN_DRIVER",
      "context": "handle:VEH",
      "kind": "Delegation",
      "source_path": [
        "VEH_DRIVER"
      ],
      "target_path": [
        "P_HMI",
        "HMI_DRIVER"
      ],
      "name": "driverBoundary"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_DRIVER",
      "connector": "handle:CONN_DRIVER",
      "source_path": [
        "VEH_DRIVER"
      ],
      "target_path": [
        "P_HMI",
        "HMI_DRIVER"
      ],
      "conveyed_items": [
        "handle:DATA_DRIVER"
      ],
      "name": "driverBoundaryFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_HMI_CTRL",
      "context": "handle:VEH",
      "kind": "Assembly",
      "source_path": [
        "P_HMI",
        "HMI_CTRL"
      ],
      "target_path": [
        "P_VCONTROL",
        "CTRL_DRIVER"
      ],
      "name": "driverCommands"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_HMI_CTRL",
      "connector": "handle:CONN_HMI_CTRL",
      "source_path": [
        "P_HMI",
        "HMI_CTRL"
      ],
      "target_path": [
        "P_VCONTROL",
        "CTRL_DRIVER"
      ],
      "conveyed_items": [
        "handle:DATA_DRIVER"
      ],
      "name": "driverCommandsFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_SENSOR_CTRL",
      "context": "handle:VEH",
      "kind": "Assembly",
      "source_path": [
        "P_SENSORS",
        "SENS_DATA"
      ],
      "target_path": [
        "P_VCONTROL",
        "CTRL_SENSOR"
      ],
      "name": "vehicleSensorData"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_SENSOR_CTRL",
      "connector": "handle:CONN_SENSOR_CTRL",
      "source_path": [
        "P_SENSORS",
        "SENS_DATA"
      ],
      "target_path": [
        "P_VCONTROL",
        "CTRL_SENSOR"
      ],
      "conveyed_items": [
        "handle:DATA_SENSOR"
      ],
      "name": "vehicleSensorDataFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_CTRL_PT",
      "context": "handle:VEH",
      "kind": "Assembly",
      "source_path": [
        "P_VCONTROL",
        "CTRL_TORQUE"
      ],
      "target_path": [
        "P_POWERTRAIN",
        "PT_TORQUE"
      ],
      "name": "torqueCommand"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_CTRL_PT",
      "connector": "handle:CONN_CTRL_PT",
      "source_path": [
        "P_VCONTROL",
        "CTRL_TORQUE"
      ],
      "target_path": [
        "P_POWERTRAIN",
        "PT_TORQUE"
      ],
      "conveyed_items": [
        "handle:DATA_TORQUE"
      ],
      "name": "torqueCommandFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_CTRL_BRAKE",
      "context": "handle:VEH",
      "kind": "Assembly",
      "source_path": [
        "P_VCONTROL",
        "CTRL_BRAKE"
      ],
      "target_path": [
        "P_BRAKES",
        "BRAKE_CMD"
      ],
      "name": "brakeCommand"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_CTRL_BRAKE",
      "connector": "handle:CONN_CTRL_BRAKE",
      "source_path": [
        "P_VCONTROL",
        "CTRL_BRAKE"
      ],
      "target_path": [
        "P_BRAKES",
        "BRAKE_CMD"
      ],
      "conveyed_items": [
        "handle:DATA_BRAKE"
      ],
      "name": "brakeCommandFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_ENERGY_PT",
      "context": "handle:VEH",
      "kind": "Assembly",
      "source_path": [
        "P_ENERGY",
        "ENERGY_HV"
      ],
      "target_path": [
        "P_POWERTRAIN",
        "PT_HV"
      ],
      "name": "tractionPower"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_ENERGY_PT",
      "connector": "handle:CONN_ENERGY_PT",
      "source_path": [
        "P_ENERGY",
        "ENERGY_HV"
      ],
      "target_path": [
        "P_POWERTRAIN",
        "PT_HV"
      ],
      "conveyed_items": [
        "handle:DATA_HV"
      ],
      "name": "tractionPowerFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_ENERGY_THERM",
      "context": "handle:VEH",
      "kind": "Assembly",
      "source_path": [
        "P_ENERGY",
        "ENERGY_THERM"
      ],
      "target_path": [
        "P_THERMAL",
        "THERM_ENERGY"
      ],
      "name": "batteryThermalLoop"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_ENERGY_THERM",
      "connector": "handle:CONN_ENERGY_THERM",
      "source_path": [
        "P_ENERGY",
        "ENERGY_THERM"
      ],
      "target_path": [
        "P_THERMAL",
        "THERM_ENERGY"
      ],
      "conveyed_items": [
        "handle:DATA_THERMAL"
      ],
      "name": "batteryThermalLoopFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_CHARGE_BOUND",
      "context": "handle:VEH",
      "kind": "Delegation",
      "source_path": [
        "VEH_CHARGE"
      ],
      "target_path": [
        "P_CHARGE",
        "CHARGE_EXT"
      ],
      "name": "chargeBoundary"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_CHARGE_BOUND",
      "connector": "handle:CONN_CHARGE_BOUND",
      "source_path": [
        "VEH_CHARGE"
      ],
      "target_path": [
        "P_CHARGE",
        "CHARGE_EXT"
      ],
      "conveyed_items": [
        "handle:DATA_CHARGE"
      ],
      "name": "chargeBoundaryFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_CHARGE_ENERGY",
      "context": "handle:VEH",
      "kind": "Assembly",
      "source_path": [
        "P_CHARGE",
        "CHARGE_OUT"
      ],
      "target_path": [
        "P_ENERGY",
        "ENERGY_CHARGE"
      ],
      "name": "chargePower"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_CHARGE_ENERGY",
      "connector": "handle:CONN_CHARGE_ENERGY",
      "source_path": [
        "P_CHARGE",
        "CHARGE_OUT"
      ],
      "target_path": [
        "P_ENERGY",
        "ENERGY_CHARGE"
      ],
      "conveyed_items": [
        "handle:DATA_CHARGE"
      ],
      "name": "chargePowerFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_SERVICE_BOUND",
      "context": "handle:VEH",
      "kind": "Delegation",
      "source_path": [
        "VEH_SERVICE"
      ],
      "target_path": [
        "P_DIAG",
        "DIAG_SERVICE"
      ],
      "name": "serviceBoundary"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_SERVICE_BOUND",
      "connector": "handle:CONN_SERVICE_BOUND",
      "source_path": [
        "VEH_SERVICE"
      ],
      "target_path": [
        "P_DIAG",
        "DIAG_SERVICE"
      ],
      "conveyed_items": [
        "handle:DATA_DIAG"
      ],
      "name": "serviceBoundaryFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_DIAG_CTRL",
      "context": "handle:VEH",
      "kind": "Assembly",
      "source_path": [
        "P_DIAG",
        "DIAG_CTRL"
      ],
      "target_path": [
        "P_VCONTROL",
        "CTRL_DIAG"
      ],
      "name": "diagnosticControl"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_DIAG_CTRL",
      "connector": "handle:CONN_DIAG_CTRL",
      "source_path": [
        "P_DIAG",
        "DIAG_CTRL"
      ],
      "target_path": [
        "P_VCONTROL",
        "CTRL_DIAG"
      ],
      "conveyed_items": [
        "handle:DATA_DIAG"
      ],
      "name": "diagnosticControlFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_PT_HV",
      "context": "handle:POWERTRAIN",
      "kind": "Delegation",
      "source_path": [
        "PT_HV"
      ],
      "target_path": [
        "PT_INV",
        "INV_HV"
      ],
      "name": "powerDelegation"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_PT_HV",
      "connector": "handle:CONN_PT_HV",
      "source_path": [
        "PT_HV"
      ],
      "target_path": [
        "PT_INV",
        "INV_HV"
      ],
      "conveyed_items": [
        "handle:DATA_HV"
      ],
      "name": "powerDelegationFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_PT_CMD",
      "context": "handle:POWERTRAIN",
      "kind": "Delegation",
      "source_path": [
        "PT_TORQUE"
      ],
      "target_path": [
        "PT_INV",
        "INV_CMD"
      ],
      "name": "torqueDelegation"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_PT_CMD",
      "connector": "handle:CONN_PT_CMD",
      "source_path": [
        "PT_TORQUE"
      ],
      "target_path": [
        "PT_INV",
        "INV_CMD"
      ],
      "conveyed_items": [
        "handle:DATA_TORQUE"
      ],
      "name": "torqueDelegationFlow"
    },
    {
      "op": "connector",
      "external_id": "CONN_INV_MOTOR",
      "context": "handle:POWERTRAIN",
      "kind": "Assembly",
      "source_path": [
        "PT_INV",
        "INV_MOTOR"
      ],
      "target_path": [
        "PT_MOTOR",
        "MOTOR_POWER"
      ],
      "name": "motorElectricalPower"
    },
    {
      "op": "item_flow",
      "external_id": "FLOW_INV_MOTOR",
      "connector": "handle:CONN_INV_MOTOR",
      "source_path": [
        "PT_INV",
        "INV_MOTOR"
      ],
      "target_path": [
        "PT_MOTOR",
        "MOTOR_POWER"
      ],
      "conveyed_items": [
        "handle:DATA_MOTOR"
      ],
      "name": "motorElectricalPowerFlow"
    },
    {
      "op": "activity",
      "external_id": "ACT_START",
      "name": "Start Vehicle",
      "owner": "$root"
    },
    {
      "op": "activity_node",
      "external_id": "START_INIT",
      "activity": "handle:ACT_START",
      "name": "Initial",
      "node": {
        "kind": "initial"
      }
    },
    {
      "op": "activity_node",
      "external_id": "START_ACCEPT",
      "activity": "handle:ACT_START",
      "name": "Accept Start Command",
      "node": {
        "kind": "opaque_action",
        "body": "captureStartCommand()"
      }
    },
    {
      "op": "activity_node",
      "external_id": "START_CALL",
      "activity": "handle:ACT_START",
      "name": "Start Controller",
      "node": {
        "kind": "opaque_action",
        "body": "startVehicleController()"
      }
    },
    {
      "op": "activity_node",
      "external_id": "START_ENABLE",
      "activity": "handle:ACT_START",
      "name": "Enable Traction Power",
      "node": {
        "kind": "opaque_action",
        "body": "enableTractionPower()"
      }
    },
    {
      "op": "activity_node",
      "external_id": "START_AVAILABLE",
      "activity": "handle:ACT_START",
      "name": "Confirm Power Available",
      "node": {
        "kind": "opaque_action",
        "body": "confirmPowerAvailable()"
      }
    },
    {
      "op": "activity_node",
      "external_id": "START_READY",
      "activity": "handle:ACT_START",
      "name": "Announce Vehicle Ready",
      "node": {
        "kind": "opaque_action",
        "body": "announceVehicleReady()"
      }
    },
    {
      "op": "activity_node",
      "external_id": "START_FINAL",
      "activity": "handle:ACT_START",
      "name": "Ready",
      "node": {
        "kind": "activity_final"
      }
    },
    {
      "op": "activity_edge",
      "external_id": "START_E1",
      "activity": "handle:ACT_START",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:START_INIT",
      "target": "handle:START_ACCEPT"
    },
    {
      "op": "activity_edge",
      "external_id": "START_E2",
      "activity": "handle:ACT_START",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:START_ACCEPT",
      "target": "handle:START_CALL"
    },
    {
      "op": "activity_edge",
      "external_id": "START_E3",
      "activity": "handle:ACT_START",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:START_CALL",
      "target": "handle:START_ENABLE"
    },
    {
      "op": "activity_edge",
      "external_id": "START_E4",
      "activity": "handle:ACT_START",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:START_ENABLE",
      "target": "handle:START_AVAILABLE"
    },
    {
      "op": "activity_edge",
      "external_id": "START_E5",
      "activity": "handle:ACT_START",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:START_AVAILABLE",
      "target": "handle:START_READY"
    },
    {
      "op": "activity_edge",
      "external_id": "START_E6",
      "activity": "handle:ACT_START",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:START_READY",
      "target": "handle:START_FINAL"
    },
    {
      "op": "activity",
      "external_id": "ACT_DRIVE",
      "name": "Deliver Requested Torque",
      "owner": "$root"
    },
    {
      "op": "activity_node",
      "external_id": "DRIVE_INIT",
      "activity": "handle:ACT_DRIVE",
      "name": "Initial",
      "node": {
        "kind": "initial"
      }
    },
    {
      "op": "activity_node",
      "external_id": "DRIVE_VALIDATE",
      "activity": "handle:ACT_DRIVE",
      "name": "Validate Drive Request",
      "node": {
        "kind": "opaque_action",
        "body": "validateDriveRequest()"
      }
    },
    {
      "op": "activity_node",
      "external_id": "DRIVE_TORQUE",
      "activity": "handle:ACT_DRIVE",
      "name": "Compute Torque Command",
      "node": {
        "kind": "opaque_action",
        "body": "computeTorqueCommand()"
      }
    },
    {
      "op": "activity_node",
      "external_id": "DRIVE_SEND",
      "activity": "handle:ACT_DRIVE",
      "name": "Publish Torque Command",
      "node": {
        "kind": "opaque_action",
        "body": "publishTorqueCommand()"
      }
    },
    {
      "op": "activity_node",
      "external_id": "DRIVE_FINAL",
      "activity": "handle:ACT_DRIVE",
      "name": "Torque Delivered",
      "node": {
        "kind": "activity_final"
      }
    },
    {
      "op": "activity_edge",
      "external_id": "DRIVE_E1",
      "activity": "handle:ACT_DRIVE",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:DRIVE_INIT",
      "target": "handle:DRIVE_VALIDATE"
    },
    {
      "op": "activity_edge",
      "external_id": "DRIVE_E2",
      "activity": "handle:ACT_DRIVE",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:DRIVE_VALIDATE",
      "target": "handle:DRIVE_TORQUE"
    },
    {
      "op": "activity_edge",
      "external_id": "DRIVE_E3",
      "activity": "handle:ACT_DRIVE",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:DRIVE_TORQUE",
      "target": "handle:DRIVE_SEND"
    },
    {
      "op": "activity_edge",
      "external_id": "DRIVE_E4",
      "activity": "handle:ACT_DRIVE",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:DRIVE_SEND",
      "target": "handle:DRIVE_FINAL"
    },
    {
      "op": "activity",
      "external_id": "ACT_OPERATE",
      "name": "Operate Electric Vehicle",
      "owner": "$root"
    },
    {
      "op": "activity_node",
      "external_id": "OPERATE_INIT",
      "activity": "handle:ACT_OPERATE",
      "name": "Initial",
      "node": {
        "kind": "initial"
      }
    },
    {
      "op": "activity_node",
      "external_id": "OPERATE_START",
      "activity": "handle:ACT_OPERATE",
      "name": "Start Vehicle",
      "node": {
        "kind": "call_behavior",
        "activity": "handle:ACT_START"
      }
    },
    {
      "op": "activity_node",
      "external_id": "OPERATE_DRIVE",
      "activity": "handle:ACT_OPERATE",
      "name": "Deliver Requested Torque",
      "node": {
        "kind": "call_behavior",
        "activity": "handle:ACT_DRIVE"
      }
    },
    {
      "op": "activity_node",
      "external_id": "OPERATE_BRAKE",
      "activity": "handle:ACT_OPERATE",
      "name": "Apply Braking",
      "node": {
        "kind": "opaque_action",
        "body": "applyBraking()"
      }
    },
    {
      "op": "activity_node",
      "external_id": "OPERATE_STOP",
      "activity": "handle:ACT_OPERATE",
      "name": "Stop Vehicle",
      "node": {
        "kind": "opaque_action",
        "body": "stopVehicle()"
      }
    },
    {
      "op": "activity_node",
      "external_id": "OPERATE_FINAL",
      "activity": "handle:ACT_OPERATE",
      "name": "Complete",
      "node": {
        "kind": "activity_final"
      }
    },
    {
      "op": "activity_edge",
      "external_id": "OPERATE_E1",
      "activity": "handle:ACT_OPERATE",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:OPERATE_INIT",
      "target": "handle:OPERATE_START"
    },
    {
      "op": "activity_edge",
      "external_id": "OPERATE_E2",
      "activity": "handle:ACT_OPERATE",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:OPERATE_START",
      "target": "handle:OPERATE_DRIVE"
    },
    {
      "op": "activity_edge",
      "external_id": "OPERATE_E3",
      "activity": "handle:ACT_OPERATE",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:OPERATE_DRIVE",
      "target": "handle:OPERATE_BRAKE"
    },
    {
      "op": "activity_edge",
      "external_id": "OPERATE_E4",
      "activity": "handle:ACT_OPERATE",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:OPERATE_BRAKE",
      "target": "handle:OPERATE_STOP"
    },
    {
      "op": "activity_edge",
      "external_id": "OPERATE_E5",
      "activity": "handle:ACT_OPERATE",
      "name": "",
      "kind": "ControlFlow",
      "source": "handle:OPERATE_STOP",
      "target": "handle:OPERATE_FINAL"
    },
    {
      "op": "state_machine",
      "external_id": "SM_VEH",
      "name": "Vehicle Operating Modes",
      "context": "handle:VEH"
    },
    {
      "op": "region",
      "external_id": "SM_VEH_R",
      "name": "Operating Modes",
      "state_machine": "handle:SM_VEH"
    },
    {
      "op": "vertex",
      "external_id": "SV_INIT",
      "region": "handle:SM_VEH_R",
      "name": "Initial",
      "vertex": {
        "kind": "pseudostate",
        "pseudostate": "Initial"
      }
    },
    {
      "op": "vertex",
      "external_id": "SV_OFF",
      "region": "handle:SM_VEH_R",
      "name": "Off",
      "vertex": {
        "kind": "state"
      }
    },
    {
      "op": "vertex",
      "external_id": "SV_START",
      "region": "handle:SM_VEH_R",
      "name": "Starting",
      "vertex": {
        "kind": "state"
      }
    },
    {
      "op": "vertex",
      "external_id": "SV_READY",
      "region": "handle:SM_VEH_R",
      "name": "Ready",
      "vertex": {
        "kind": "state"
      }
    },
    {
      "op": "vertex",
      "external_id": "SV_DRIVE",
      "region": "handle:SM_VEH_R",
      "name": "Driving",
      "vertex": {
        "kind": "state"
      }
    },
    {
      "op": "vertex",
      "external_id": "SV_FAULT",
      "region": "handle:SM_VEH_R",
      "name": "Fault",
      "vertex": {
        "kind": "state"
      }
    },
    {
      "op": "vertex",
      "external_id": "SV_COMPLETE",
      "region": "handle:SM_VEH_R",
      "name": "Complete",
      "vertex": {
        "kind": "final_state"
      }
    },
    {
      "op": "transition",
      "external_id": "SV_T0",
      "region": "handle:SM_VEH_R",
      "source": "handle:SV_INIT",
      "target": "handle:SV_OFF"
    },
    {
      "op": "transition",
      "external_id": "SV_T1",
      "region": "handle:SM_VEH_R",
      "source": "handle:SV_OFF",
      "target": "handle:SV_START",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_START"
      }
    },
    {
      "op": "transition",
      "external_id": "SV_T2",
      "region": "handle:SM_VEH_R",
      "source": "handle:SV_START",
      "target": "handle:SV_READY",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_READY"
      }
    },
    {
      "op": "transition",
      "external_id": "SV_T3",
      "region": "handle:SM_VEH_R",
      "source": "handle:SV_READY",
      "target": "handle:SV_DRIVE",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_TORQUE"
      }
    },
    {
      "op": "transition",
      "external_id": "SV_T4",
      "region": "handle:SM_VEH_R",
      "source": "handle:SV_DRIVE",
      "target": "handle:SV_COMPLETE",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_STOP"
      }
    },
    {
      "op": "transition",
      "external_id": "SV_T5",
      "region": "handle:SM_VEH_R",
      "source": "handle:SV_READY",
      "target": "handle:SV_FAULT",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_FAULT"
      }
    },
    {
      "op": "transition",
      "external_id": "SV_T6",
      "region": "handle:SM_VEH_R",
      "source": "handle:SV_DRIVE",
      "target": "handle:SV_FAULT",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_FAULT"
      }
    },
    {
      "op": "state_machine",
      "external_id": "SM_ENERGY",
      "name": "Energy Storage Operating Modes",
      "context": "handle:ENERGY"
    },
    {
      "op": "region",
      "external_id": "SM_EN_R",
      "name": "Energy Modes",
      "state_machine": "handle:SM_ENERGY"
    },
    {
      "op": "vertex",
      "external_id": "SE_INIT",
      "region": "handle:SM_EN_R",
      "name": "Initial",
      "vertex": {
        "kind": "pseudostate",
        "pseudostate": "Initial"
      }
    },
    {
      "op": "vertex",
      "external_id": "SE_IDLE",
      "region": "handle:SM_EN_R",
      "name": "Idle",
      "vertex": {
        "kind": "state"
      }
    },
    {
      "op": "vertex",
      "external_id": "SE_DISCHARGE",
      "region": "handle:SM_EN_R",
      "name": "Discharging",
      "vertex": {
        "kind": "state"
      }
    },
    {
      "op": "vertex",
      "external_id": "SE_CHARGE",
      "region": "handle:SM_EN_R",
      "name": "Charging",
      "vertex": {
        "kind": "state"
      }
    },
    {
      "op": "vertex",
      "external_id": "SE_FAULT",
      "region": "handle:SM_EN_R",
      "name": "Fault",
      "vertex": {
        "kind": "state"
      }
    },
    {
      "op": "vertex",
      "external_id": "SE_COMPLETE",
      "region": "handle:SM_EN_R",
      "name": "Complete",
      "vertex": {
        "kind": "final_state"
      }
    },
    {
      "op": "transition",
      "external_id": "SE_T0",
      "region": "handle:SM_EN_R",
      "source": "handle:SE_INIT",
      "target": "handle:SE_IDLE"
    },
    {
      "op": "transition",
      "external_id": "SE_T1",
      "region": "handle:SM_EN_R",
      "source": "handle:SE_IDLE",
      "target": "handle:SE_DISCHARGE",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_POWER_ENABLE"
      }
    },
    {
      "op": "transition",
      "external_id": "SE_T2",
      "region": "handle:SM_EN_R",
      "source": "handle:SE_DISCHARGE",
      "target": "handle:SE_COMPLETE",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_STOP"
      }
    },
    {
      "op": "transition",
      "external_id": "SE_T3",
      "region": "handle:SM_EN_R",
      "source": "handle:SE_IDLE",
      "target": "handle:SE_CHARGE",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_CHARGE_REQ"
      }
    },
    {
      "op": "transition",
      "external_id": "SE_T4",
      "region": "handle:SM_EN_R",
      "source": "handle:SE_CHARGE",
      "target": "handle:SE_COMPLETE",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_CHARGE_DONE"
      }
    },
    {
      "op": "transition",
      "external_id": "SE_T5",
      "region": "handle:SM_EN_R",
      "source": "handle:SE_IDLE",
      "target": "handle:SE_FAULT",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_FAULT"
      }
    },
    {
      "op": "transition",
      "external_id": "SE_T6",
      "region": "handle:SM_EN_R",
      "source": "handle:SE_DISCHARGE",
      "target": "handle:SE_FAULT",
      "trigger": {
        "kind": "signal",
        "signal": "handle:SIG_FAULT"
      }
    },
    {
      "op": "interaction",
      "external_id": "SEQ_START",
      "name": "Vehicle Startup Sequence",
      "context": "handle:VEH"
    },
    {
      "op": "lifeline",
      "external_id": "LL_HMI",
      "interaction": "handle:SEQ_START",
      "name": "driverInterface",
      "represented_path": [
        "handle:P_HMI"
      ]
    },
    {
      "op": "lifeline",
      "external_id": "LL_CTRL",
      "interaction": "handle:SEQ_START",
      "name": "vehicleControl",
      "represented_path": [
        "handle:P_VCONTROL"
      ]
    },
    {
      "op": "lifeline",
      "external_id": "LL_ENERGY",
      "interaction": "handle:SEQ_START",
      "name": "energyStorage",
      "represented_path": [
        "handle:P_ENERGY"
      ]
    },
    {
      "op": "lifeline",
      "external_id": "LL_INV",
      "interaction": "handle:SEQ_START",
      "name": "powertrain.inverter",
      "represented_path": [
        "handle:P_POWERTRAIN",
        "handle:PT_INV"
      ]
    },
    {
      "op": "occurrence",
      "external_id": "O1",
      "interaction": "handle:SEQ_START",
      "lifeline": "handle:LL_HMI",
      "order": 1
    },
    {
      "op": "occurrence",
      "external_id": "O2",
      "interaction": "handle:SEQ_START",
      "lifeline": "handle:LL_CTRL",
      "order": 2
    },
    {
      "op": "occurrence",
      "external_id": "O3",
      "interaction": "handle:SEQ_START",
      "lifeline": "handle:LL_CTRL",
      "order": 3
    },
    {
      "op": "occurrence",
      "external_id": "O4",
      "interaction": "handle:SEQ_START",
      "lifeline": "handle:LL_ENERGY",
      "order": 4
    },
    {
      "op": "occurrence",
      "external_id": "O5",
      "interaction": "handle:SEQ_START",
      "lifeline": "handle:LL_ENERGY",
      "order": 5
    },
    {
      "op": "occurrence",
      "external_id": "O6",
      "interaction": "handle:SEQ_START",
      "lifeline": "handle:LL_CTRL",
      "order": 6
    },
    {
      "op": "occurrence",
      "external_id": "O7",
      "interaction": "handle:SEQ_START",
      "lifeline": "handle:LL_CTRL",
      "order": 7
    },
    {
      "op": "occurrence",
      "external_id": "O8",
      "interaction": "handle:SEQ_START",
      "lifeline": "handle:LL_INV",
      "order": 8
    },
    {
      "op": "message",
      "external_id": "MSG_START",
      "interaction": "handle:SEQ_START",
      "name": "startVehicle",
      "sort": "SynchCall",
      "send": "handle:O1",
      "receive": "handle:O2",
      "signature": {
        "kind": "operation",
        "operation": "handle:OP_START"
      },
      "arguments": []
    },
    {
      "op": "execution",
      "external_id": "EX_START",
      "interaction": "handle:SEQ_START",
      "lifeline": "handle:LL_CTRL",
      "start": "handle:O2",
      "finish": "handle:O3",
      "behavior": "handle:OP_START"
    },
    {
      "op": "message",
      "external_id": "MSG_ENABLE",
      "interaction": "handle:SEQ_START",
      "name": "PowerEnable",
      "sort": "AsynchSignal",
      "send": "handle:O3",
      "receive": "handle:O4",
      "signature": {
        "kind": "signal",
        "signal": "handle:SIG_POWER_ENABLE"
      },
      "arguments": []
    },
    {
      "op": "message",
      "external_id": "MSG_AVAILABLE",
      "interaction": "handle:SEQ_START",
      "name": "PowerAvailable",
      "sort": "AsynchSignal",
      "send": "handle:O5",
      "receive": "handle:O6",
      "signature": {
        "kind": "signal",
        "signal": "handle:SIG_POWER_AVAILABLE"
      },
      "arguments": []
    },
    {
      "op": "message",
      "external_id": "MSG_TORQUE",
      "interaction": "handle:SEQ_START",
      "name": "TorqueCommand",
      "sort": "AsynchSignal",
      "send": "handle:O7",
      "receive": "handle:O8",
      "signature": {
        "kind": "signal",
        "signal": "handle:SIG_TORQUE"
      },
      "arguments": []
    },
    {
      "op": "state_invariant",
      "external_id": "INV_READY",
      "interaction": "handle:SEQ_START",
      "lifeline": "handle:LL_CTRL",
      "order": 7,
      "constraint": "vehicleReady == true"
    },
    {
      "op": "element",
      "external_id": "FORCE_ANALYSIS",
      "kind": "Block",
      "name": "TractiveForceAnalysis",
      "owner": "handle:PKG_ANALYSIS",
      "documentation": "Executable parametric analysis. Nominal demo point: mass 1800 kg and acceleration 4.0 m/s^2; computes tractive force and demonstrates margin against force/acceleration requirements."
    },
    {
      "op": "element",
      "external_id": "A_FORCE_MASS",
      "kind": "ValueProperty",
      "name": "mass",
      "owner": "handle:FORCE_ANALYSIS",
      "type_ref": "handle:REAL",
      "default_value": "1800"
    },
    {
      "op": "element",
      "external_id": "A_FORCE_ACCEL",
      "kind": "ValueProperty",
      "name": "acceleration",
      "owner": "handle:FORCE_ANALYSIS",
      "type_ref": "handle:REAL",
      "default_value": "4.0"
    },
    {
      "op": "element",
      "external_id": "A_FORCE_OUT",
      "kind": "ValueProperty",
      "name": "tractiveForce",
      "owner": "handle:FORCE_ANALYSIS",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CB_FORCE",
      "kind": "ConstraintBlock",
      "name": "TractiveForceEquation",
      "owner": "handle:PKG_ANALYSIS"
    },
    {
      "op": "element",
      "external_id": "CF_M",
      "kind": "ConstraintParameter",
      "name": "m",
      "owner": "handle:CB_FORCE",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CF_A",
      "kind": "ConstraintParameter",
      "name": "a",
      "owner": "handle:CB_FORCE",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CF_F",
      "kind": "ConstraintParameter",
      "name": "F",
      "owner": "handle:CB_FORCE",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CPROP_FORCE",
      "kind": "ConstraintProperty",
      "name": "forceConstraint",
      "owner": "handle:FORCE_ANALYSIS",
      "type_ref": "handle:CB_FORCE"
    },
    {
      "op": "parametric_metadata",
      "element": "handle:CB_FORCE",
      "constraint_expression": "F = m * a"
    },
    {
      "op": "binding",
      "external_id": "B_FORCE_M",
      "name": "massBinding",
      "owner": "handle:FORCE_ANALYSIS",
      "source": {
        "role": "handle:A_FORCE_MASS"
      },
      "target": {
        "role": "handle:CPROP_FORCE",
        "parameter": "handle:CF_M"
      }
    },
    {
      "op": "binding",
      "external_id": "B_FORCE_A",
      "name": "accelerationBinding",
      "owner": "handle:FORCE_ANALYSIS",
      "source": {
        "role": "handle:A_FORCE_ACCEL"
      },
      "target": {
        "role": "handle:CPROP_FORCE",
        "parameter": "handle:CF_A"
      }
    },
    {
      "op": "binding",
      "external_id": "B_FORCE_F",
      "name": "forceBinding",
      "owner": "handle:FORCE_ANALYSIS",
      "source": {
        "role": "handle:A_FORCE_OUT"
      },
      "target": {
        "role": "handle:CPROP_FORCE",
        "parameter": "handle:CF_F"
      }
    },
    {
      "op": "relationship",
      "external_id": "REF_FORCE",
      "kind": "Refine",
      "source": "handle:CB_FORCE",
      "target": "handle:REQ_PERF_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "element",
      "external_id": "POWER_ANALYSIS",
      "kind": "Block",
      "name": "ElectricalPowerAnalysis",
      "owner": "handle:PKG_ANALYSIS",
      "documentation": "Executable parametric analysis. Computes electrical traction power from force, vehicle speed, and power-conversion efficiency."
    },
    {
      "op": "element",
      "external_id": "A_POWER_FORCE",
      "kind": "ValueProperty",
      "name": "forceInput",
      "owner": "handle:POWER_ANALYSIS",
      "type_ref": "handle:REAL",
      "default_value": "7200"
    },
    {
      "op": "element",
      "external_id": "A_POWER_SPEED",
      "kind": "ValueProperty",
      "name": "targetSpeed",
      "owner": "handle:POWER_ANALYSIS",
      "type_ref": "handle:REAL",
      "default_value": "20"
    },
    {
      "op": "element",
      "external_id": "A_POWER_EFF",
      "kind": "ValueProperty",
      "name": "conversionEfficiency",
      "owner": "handle:POWER_ANALYSIS",
      "type_ref": "handle:REAL",
      "default_value": "0.95"
    },
    {
      "op": "element",
      "external_id": "A_POWER_OUT",
      "kind": "ValueProperty",
      "name": "electricalPower",
      "owner": "handle:POWER_ANALYSIS",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CB_POWER",
      "kind": "ConstraintBlock",
      "name": "ElectricalPowerEquation",
      "owner": "handle:PKG_ANALYSIS"
    },
    {
      "op": "element",
      "external_id": "CP_F",
      "kind": "ConstraintParameter",
      "name": "F",
      "owner": "handle:CB_POWER",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CP_V",
      "kind": "ConstraintParameter",
      "name": "v",
      "owner": "handle:CB_POWER",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CP_ETA",
      "kind": "ConstraintParameter",
      "name": "eta",
      "owner": "handle:CB_POWER",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CP_P",
      "kind": "ConstraintParameter",
      "name": "P",
      "owner": "handle:CB_POWER",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CPROP_POWER",
      "kind": "ConstraintProperty",
      "name": "powerConstraint",
      "owner": "handle:POWER_ANALYSIS",
      "type_ref": "handle:CB_POWER"
    },
    {
      "op": "parametric_metadata",
      "element": "handle:CB_POWER",
      "constraint_expression": "P = F * v / eta"
    },
    {
      "op": "binding",
      "external_id": "B_POWER_F",
      "name": "forceBinding",
      "owner": "handle:POWER_ANALYSIS",
      "source": {
        "role": "handle:A_POWER_FORCE"
      },
      "target": {
        "role": "handle:CPROP_POWER",
        "parameter": "handle:CP_F"
      }
    },
    {
      "op": "binding",
      "external_id": "B_POWER_V",
      "name": "speedBinding",
      "owner": "handle:POWER_ANALYSIS",
      "source": {
        "role": "handle:A_POWER_SPEED"
      },
      "target": {
        "role": "handle:CPROP_POWER",
        "parameter": "handle:CP_V"
      }
    },
    {
      "op": "binding",
      "external_id": "B_POWER_ETA",
      "name": "efficiencyBinding",
      "owner": "handle:POWER_ANALYSIS",
      "source": {
        "role": "handle:A_POWER_EFF"
      },
      "target": {
        "role": "handle:CPROP_POWER",
        "parameter": "handle:CP_ETA"
      }
    },
    {
      "op": "binding",
      "external_id": "B_POWER_P",
      "name": "powerBinding",
      "owner": "handle:POWER_ANALYSIS",
      "source": {
        "role": "handle:A_POWER_OUT"
      },
      "target": {
        "role": "handle:CPROP_POWER",
        "parameter": "handle:CP_P"
      }
    },
    {
      "op": "relationship",
      "external_id": "REF_POWER",
      "kind": "Refine",
      "source": "handle:CB_POWER",
      "target": "handle:REQ_PERF_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "element",
      "external_id": "RANGE_ANALYSIS",
      "kind": "Block",
      "name": "DrivingRangeAnalysis",
      "owner": "handle:PKG_ANALYSIS",
      "documentation": "Executable parametric analysis. Computes nominal range from usable battery energy and energy consumption; demo point provides margin over the 400 km stakeholder target."
    },
    {
      "op": "element",
      "external_id": "A_RANGE_E",
      "kind": "ValueProperty",
      "name": "usableEnergy",
      "owner": "handle:RANGE_ANALYSIS",
      "type_ref": "handle:REAL",
      "default_value": "82"
    },
    {
      "op": "element",
      "external_id": "A_RANGE_C",
      "kind": "ValueProperty",
      "name": "energyConsumption",
      "owner": "handle:RANGE_ANALYSIS",
      "type_ref": "handle:REAL",
      "default_value": "0.18"
    },
    {
      "op": "element",
      "external_id": "A_RANGE_OUT",
      "kind": "ValueProperty",
      "name": "estimatedRange",
      "owner": "handle:RANGE_ANALYSIS",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CB_RANGE",
      "kind": "ConstraintBlock",
      "name": "RangeEquation",
      "owner": "handle:PKG_ANALYSIS"
    },
    {
      "op": "element",
      "external_id": "CR_E",
      "kind": "ConstraintParameter",
      "name": "E",
      "owner": "handle:CB_RANGE",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CR_C",
      "kind": "ConstraintParameter",
      "name": "c",
      "owner": "handle:CB_RANGE",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CR_R",
      "kind": "ConstraintParameter",
      "name": "R",
      "owner": "handle:CB_RANGE",
      "type_ref": "handle:REAL"
    },
    {
      "op": "element",
      "external_id": "CPROP_RANGE",
      "kind": "ConstraintProperty",
      "name": "rangeConstraint",
      "owner": "handle:RANGE_ANALYSIS",
      "type_ref": "handle:CB_RANGE"
    },
    {
      "op": "parametric_metadata",
      "element": "handle:CB_RANGE",
      "constraint_expression": "R = E / c"
    },
    {
      "op": "binding",
      "external_id": "B_RANGE_E",
      "name": "energyBinding",
      "owner": "handle:RANGE_ANALYSIS",
      "source": {
        "role": "handle:A_RANGE_E"
      },
      "target": {
        "role": "handle:CPROP_RANGE",
        "parameter": "handle:CR_E"
      }
    },
    {
      "op": "binding",
      "external_id": "B_RANGE_C",
      "name": "consumptionBinding",
      "owner": "handle:RANGE_ANALYSIS",
      "source": {
        "role": "handle:A_RANGE_C"
      },
      "target": {
        "role": "handle:CPROP_RANGE",
        "parameter": "handle:CR_C"
      }
    },
    {
      "op": "binding",
      "external_id": "B_RANGE_R",
      "name": "rangeBinding",
      "owner": "handle:RANGE_ANALYSIS",
      "source": {
        "role": "handle:A_RANGE_OUT"
      },
      "target": {
        "role": "handle:CPROP_RANGE",
        "parameter": "handle:CR_R"
      }
    },
    {
      "op": "relationship",
      "external_id": "REF_RANGE",
      "kind": "Refine",
      "source": "handle:CB_RANGE",
      "target": "handle:REQ_PERF_003",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "REF_START_OP",
      "kind": "Refine",
      "source": "handle:OP_START",
      "target": "handle:REQ_SYS_001",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "REF_TORQUE_OP",
      "kind": "Refine",
      "source": "handle:OP_TORQUE",
      "target": "handle:REQ_SYS_002",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "REF_BRAKE_OP",
      "kind": "Refine",
      "source": "handle:OP_BRAKE",
      "target": "handle:REQ_SYS_004",
      "owner": "handle:PKG_REQ"
    },
    {
      "op": "relationship",
      "external_id": "REF_CHARGE_OP",
      "kind": "Refine",
      "source": "handle:OP_CHARGE",
      "target": "handle:REQ_SYS_008",
      "owner": "handle:PKG_REQ"
    }
  ],
  "diagrams": [
    {
      "external_id": "D_PKG",
      "family": "Package",
      "name": "01 Requirements Package Organization",
      "owner": "handle:PKG_REQ",
      "populate": true,
      "clean_layout": false,
      "route": false
    },
    {
      "external_id": "D_REQ",
      "family": "Requirement",
      "name": "02 Requirements and Verification",
      "owner": "handle:PKG_VERIFY_VIEW",
      "populate": true,
      "clean_layout": false,
      "route": false
    },
    {
      "external_id": "D_UC",
      "family": "Use Case",
      "name": "03 Electric Vehicle Use Cases",
      "owner": "handle:PKG_UC",
      "context": "handle:VEH",
      "populate": true,
      "clean_layout": false,
      "route": false
    },
    {
      "external_id": "D_BDD",
      "family": "BDD",
      "name": "04 Electric Vehicle Definition",
      "owner": "handle:PKG_ARCH",
      "populate": true,
      "clean_layout": false,
      "route": false
    },
    {
      "external_id": "D_IBD",
      "family": "IBD",
      "name": "05 Electric Vehicle Internal Structure",
      "owner": "handle:PKG_ARCH",
      "context": "handle:VEH",
      "populate": true,
      "clean_layout": false,
      "route": false
    },
    {
      "external_id": "D_ACT",
      "family": "Activity",
      "name": "06 Operate Electric Vehicle",
      "owner": "handle:PKG_ACT",
      "semantic": "handle:ACT_OPERATE",
      "populate": true,
      "clean_layout": false,
      "route": false
    },
    {
      "external_id": "D_SM",
      "family": "State Machine",
      "name": "07 Vehicle Operating Modes",
      "owner": "handle:PKG_STATE",
      "semantic": "handle:SM_VEH",
      "populate": true,
      "clean_layout": false,
      "route": false
    },
    {
      "external_id": "D_SEQ",
      "family": "Sequence",
      "name": "08 Vehicle Startup Sequence",
      "owner": "handle:PKG_SEQ",
      "semantic": "handle:SEQ_START",
      "populate": true,
      "clean_layout": false,
      "route": false
    },
    {
      "external_id": "D_PAR",
      "family": "Parametric",
      "name": "09 Tractive Force Analysis",
      "owner": "handle:PKG_ANALYSIS",
      "context": "handle:FORCE_ANALYSIS",
      "populate": true,
      "clean_layout": false,
      "route": false
    }
  ]
}
''')
