import pyodbc
import pandas as pd

print("=" * 50)
print("TEST CONNEXION SQL SERVER")
print("=" * 50)

print("\nDrivers disponibles :")
for d in pyodbc.drivers():
    print(f"  - {d}")

servers = [
  
    'ASUS',
    
]

connected = False
working_server = None

for srv in servers:
    try:
        conn = pyodbc.connect(
            f'DRIVER={{ODBC Driver 17 for SQL Server}};'
            f'SERVER={srv};'
            'DATABASE=DWH_AttijariBI_Final;'
            'Trusted_Connection=yes',
            timeout=3
        )
        print(f"\n✓ CONNEXION RÉUSSIE avec SERVER={srv}")
        df = pd.read_sql(
            "SELECT COUNT(*) AS N, SUM(CAST(A_Quitte AS INT)) AS C FROM FACT_Client",
            conn
        )
        print(f"  Total clients : {df['N'][0]:,}")
        print(f"  Clients churnés : {df['C'][0]:,}")
        print(f"  Taux churn : {df['C'][0]/df['N'][0]*100:.1f}%")
        conn.close()
        connected = True
        working_server = srv
        break
    except Exception as e:
        print(f"  ✗ Échec SERVER={srv} : {str(e)[:60]}")

if connected:
    print(f"\n→ Utilise SERVER={working_server} dans tous les scripts ML")
else:
    print("\n✗ Aucune connexion trouvée")
    print("  Vérifie que SQL Server est démarré :")
    print("  Services Windows → SQL Server → Démarrer")
