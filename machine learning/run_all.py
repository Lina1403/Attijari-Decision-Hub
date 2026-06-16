#!/usr/bin/env python
"""
Script pour lancer la pipeline ML complète
Attijari Decision Hub
"""
import subprocess
import sys
import os

def run_command(cmd, description):
    """Exécuter une commande"""
    print(f"\n{'='*60}")
    print(f"► {description}")
    print(f"{'='*60}")
    try:
        result = subprocess.run(cmd, shell=True, cwd=r"C:\Users\linab\DATAPFE\machine learning")
        if result.returncode != 0:
            print(f"✗ Erreur lors de {description}")
            return False
        print(f"✓ {description} réussi")
        return True
    except Exception as e:
        print(f"✗ Erreur : {e}")
        return False

def main():
    print("\n" + "="*60)
    print("ATTIJARI BANK — Pipeline ML Complète")
    print("="*60)

    # Étape 1 : Churn Model (déjà exécuté)
    print("\n[1/3] Churn Model")
    print("✓ ML_ChurnPredictions.csv déjà généré")

    # Étape 2 : Recommandation Model
    if not run_command(
        'python "recommandation_model.py"',
        "Lancement Modèle Recommandation"
    ):
        print("⚠ Continuez malgré tout...")

    # Étape 3 : API Flask
    print("\n[3/3] API Flask")
    print("Démarrage sur http://localhost:5000...")
    run_command(
        'python api_ml_models.py',
        "Lancement API Flask"
    )

if __name__ == '__main__':
    main()
