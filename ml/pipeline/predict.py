import sys
import json
import joblib
import pandas as pd
import os

# B100 biodiesel emits ~70% less CO2 than fossil diesel (lifecycle)
BIOFUEL_CO2_FACTOR = 0.30
# Reference vehicle consumption for efficiency normalization (L/100km)
# Derived from the mean of the training dataset (co2.csv, n=3000)
REFERENCE_CONSUMPTION = 12.94
# Base reward rate: points per (g/km saved * efficiency * liters)
BASE_POINTS_RATE = 0.01


def main():
    try:
        raw = sys.stdin.read()
        if not raw:
            raise ValueError("No input data received on stdin")

        try:
            input_data = json.loads(raw)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}")

        liters_dispensed = float(input_data['liters_dispensed'])
        fuel_consumption = float(input_data['fuel_consumption_comb_l_per_100km'])

        # Map backend field names → model-expected column names
        model_input = {
            'Engine_Size_L': float(input_data['engine_size_l']),
            'Cylinders': int(input_data['cylinders']),
            'Transmission': str(input_data['transmission']),
            'Fuel_Type': str(input_data['fuel_type']),
            'Fuel_Consumption_Comb_L_per_100_km': fuel_consumption,
            'Vehicle_type': str(input_data['vehicle_type']),
        }

        df = pd.DataFrame([model_input])

        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, '..', 'models', 'co2_baseline_model.pkl')

        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}")

        model = joblib.load(model_path)
        co2_fossil_predicted_g_km = float(model.predict(df)[0])

        co2_biofuel_actual_g_km = co2_fossil_predicted_g_km * BIOFUEL_CO2_FACTOR
        co2_saved_g_km = co2_fossil_predicted_g_km - co2_biofuel_actual_g_km

        if fuel_consumption > 0:
            efficiency_multiplier = min(max(REFERENCE_CONSUMPTION / fuel_consumption, 0.5), 2.0)
        else:
            efficiency_multiplier = 1.0

        points_awarded = co2_saved_g_km * efficiency_multiplier * liters_dispensed * BASE_POINTS_RATE

        result = {
            'co2_fossil_predicted_g_km': co2_fossil_predicted_g_km,
            'co2_biofuel_actual_g_km': co2_biofuel_actual_g_km,
            'co2_saved_g_km': co2_saved_g_km,
            'efficiency_multiplier': efficiency_multiplier,
            'points_awarded': points_awarded,
        }

        print(json.dumps(result))

    except KeyError as e:
        print(f"Error: Missing required input field: {e}", file=sys.stderr)
        sys.exit(1)
    except (TypeError, ValueError) as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
