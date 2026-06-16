from pathlib import Path

import pandas as pd
import pyodbc


OUTPUT_PATH = Path(__file__).resolve().parent / "client_identity_export.csv"
CONNECTION_STRING = (
    "DRIVER={ODBC Driver 17 for SQL Server};"
    "SERVER=ASUS;"
    "DATABASE=DWH_AttijariBI_Final;"
    "Trusted_Connection=yes;"
    "Encrypt=no;"
    "TrustServerCertificate=yes;"
)

QUERY = """
SELECT
    dc.ClientSK,
    dc.Nom,
    dc.Prenom,
    COALESCE(s.NomSegment, 'Particulier') AS NomSegment,
    COALESCE(g.Nom, 'Non renseigne') AS GouvernoratNom
FROM DIM_Client dc
LEFT JOIN FACT_Client fc ON fc.ClientSK = dc.ClientSK
LEFT JOIN DIM_Segment s ON s.SegmentID = fc.SegmentID
LEFT JOIN DIM_Gouvernorat g ON g.GouvernoratID = dc.GouvernoratID;
"""


def main() -> None:
    connection = pyodbc.connect(CONNECTION_STRING, timeout=10)
    try:
        dataframe = pd.read_sql(QUERY, connection)
    finally:
        connection.close()

    dataframe.to_csv(OUTPUT_PATH, sep=";", index=False, encoding="utf-8-sig")
    print(f"Exported {len(dataframe):,} client identities to {OUTPUT_PATH}")
    print(dataframe.head(3).to_string(index=False))


if __name__ == "__main__":
    main()
