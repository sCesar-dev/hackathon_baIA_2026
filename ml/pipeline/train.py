import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
import joblib

def main():
    # Obter o diretório raiz do projeto (2 níveis acima do diretório atual 'ml/pipeline')
    current_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(current_dir))
    
    data_path = os.path.join(project_root, 'data', 'raw', 'co2.csv')
    model_dir = os.path.join(project_root, 'ml', 'models')
    model_path = os.path.join(model_dir, 'co2_baseline_model.pkl')
    
    # Garantir que o diretório de destino do modelo exista
    os.makedirs(model_dir, exist_ok=True)
    
    # Carregar o dataset
    print(f"Carregando dados de: {data_path}")
    df = pd.read_csv(data_path)
    
    # Renomear as colunas
    df = df.rename(columns={
        'Vehicle Class': 'Vehicle_type',
        'Engine Size(L)': 'Engine_Size_L',
        'Fuel Type': 'Fuel_Type',
        'Fuel Consumption Comb (L/100 km)': 'Fuel_Consumption_Comb_L_per_100_km',
        'CO2 Emissions(g/km)': 'CO2_Emissions_g_per_km'
    })
    
    # Isolar features e target
    features = [
        'Engine_Size_L', 'Cylinders', 'Transmission', 
        'Fuel_Type', 'Fuel_Consumption_Comb_L_per_100_km', 'Vehicle_type'
    ]
    target = 'CO2_Emissions_g_per_km'
    
    X = df[features]
    y = df[target]
    
    # Configurar o pré-processamento e split
    cat_features = ['Transmission', 'Fuel_Type', 'Vehicle_type']
    num_features = ['Engine_Size_L', 'Cylinders', 'Fuel_Consumption_Comb_L_per_100_km']
    
    preprocessor = ColumnTransformer(
        transformers = [
            ('num', 'passthrough', num_features),
            ('cat', OneHotEncoder(handle_unknown='ignore'), cat_features)
    ])
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # Criar o pipeline que processa e treina
    model_pipeline = Pipeline(steps=[
        ('preprocessor', preprocessor),
        ('regressor', RandomForestRegressor(n_estimators=100, random_state=42))
    ])
    
    # Treinar o modelo
    print("Treinando o modelo...")
    model_pipeline.fit(X_train, y_train)
    
    # Avaliar métricas de regressão
    preds = model_pipeline.predict(X_test)
    r2 = r2_score(y_test, preds)
    mae = mean_absolute_error(y_test, preds)
    
    print("\n--- Métricas de Avaliação ---")
    print(f"R2 Score: {r2:.4f}")
    print(f"MAE: {mae:.4f} g/km")
    print("-----------------------------\n")
    
    # Salvar o modelo treinado
    joblib.dump(model_pipeline, model_path)
    print(f"Modelo baseline salvo com sucesso em: {model_path}")

if __name__ == "__main__":
    main()
