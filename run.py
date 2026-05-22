import sys
import os

# Adiciona o diretório atual ao PYTHONPATH para conseguir importar pacotes internos
sys.path.append(os.path.dirname(__file__))

from ml.pipeline.train import main as train_pipeline

def main():
    train_pipeline()
    
if __name__ == '__main__':
    main()
