import sys
import json
import joblib
import pandas as pd
import os

def main():
    try:
        # Check if the argument is provided
        if len(sys.argv) < 2:
            raise ValueError("No input data provided in sys.argv[1]")

        # Read JSON string argument
        input_json_str = sys.argv[1]
        
        # Parse JSON
        try:
            input_data = json.loads(input_json_str)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON string: {e}")

        # Convert to a pandas DataFrame with 1 row
        df = pd.DataFrame([input_data])

        # Resolve model path robustly based on script location
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, '..', 'models', 'co2_baseline_model.pkl')
        
        # Load the model via joblib
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at {model_path}")
            
        model = joblib.load(model_path)

        # Predict
        # If the features don't match, this will raise a ValueError from scikit-learn/pandas
        prediction = model.predict(df)

        # Print only the numerical value (float) to stdout
        print(float(prediction[0]))

    except ValueError as e:
        # Prints feature mismatch or validation errors to stderr
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        # Catch-all for any other unexpected errors
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()