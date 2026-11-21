"""Create explicit sensitivity assumptions, never observed financial inputs.

Writes only the three task-specific scenario folders beside this file.
Each monthly paying-account count is divided by 30 for founder-cfo's interface.
The main founder/numbers.json is deliberately left absent.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SCENARIOS = {
    "accompanied": {
        "support": 12500, "infrastructure": 250000, "maintenance": 500000,
        "ramp": [0, 1, 2, 3, 5, 8, 12, 16, 20, 25, 30, 35], "capacity": 40,
    },
    "efficient": {
        "support": 7000, "infrastructure": 350000, "maintenance": 250000,
        "ramp": [0, 2, 4, 6, 10, 15, 20, 25, 30, 35, 40, 45], "capacity": 50,
    },
    "support-stress": {
        "support": 37500, "infrastructure": 250000, "maintenance": 500000,
        "ramp": [0, 1, 2, 3, 5, 8, 12, 16, 20, 25, 30, 35], "capacity": 40,
    },
}

for name, assumption in SCENARIOS.items():
    spec = {
        "business": "Huella Nex — HIPÓTESIS DE SENSIBILIDAD " + name,
        "unit": "establecimiento-mes",
        "price": 49000,
        "variable": [
            {"label": "Soporte por cuenta — supuesto, no registro horario", "cost": assumption["support"]},
            {"label": "Cobro — provisión hipotética, no tarifa contratada", "cost": 2500},
            {"label": "Infraestructura incremental — provisión hipotética", "cost": 3000},
        ],
        "fixed_monthly": [
            {"label": "Infraestructura base — supuesto sin factura", "cost": assumption["infrastructure"]},
            {"label": "Mantenimiento y operación del fundador — supuesto", "cost": assumption["maintenance"]},
        ],
        "startup": [{"label": "Preparación futura — provisión de escenario", "cost": 500000}],
        "days_per_month": 30,
        "plan_per_day": assumption["ramp"][-1] / 30,
        "ramp_per_day": [n / 30 for n in assumption["ramp"]],
        "capacity_per_day": assumption["capacity"] / 30,
        "scenario_notes": {
            "currency": "COP",
            "observed": False,
            "monthly_paying_accounts": assumption["ramp"],
            "monthly_capacity_assumption": assumption["capacity"],
            "tax": "49.000 se supone ingreso antes de impuestos para esta sensibilidad; no afirma tratamiento tributario real.",
            "exclusions": "Sin IA/WhatsApp comerciales, sin inversión histórica, sin CAC nuevo ni impuestos a utilidades. No es presupuesto integral aprobado.",
        },
    }
    folder = ROOT / name
    folder.mkdir(parents=True, exist_ok=True)
    (folder / "numbers.json").write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(name + ": scenario only; " + str(assumption["ramp"][-1]) + " paying accounts/month at plan")
