"""Assemble les trois CSV du XLSForm en un classeur .xlsx importable dans KoboToolbox.

Usage : python3 scripts/xlsx_depuis_csv.py kobo/xlsform kobo/formulaire.xlsx
Dépendance : openpyxl (pip install openpyxl)
"""
import csv
import sys
from pathlib import Path

from openpyxl import Workbook


def main(dossier: str, sortie: str) -> None:
    classeur = Workbook()
    classeur.remove(classeur.active)
    for feuille in ("survey", "choices", "settings"):
        ws = classeur.create_sheet(feuille)
        with open(Path(dossier) / f"{feuille}.csv", newline="", encoding="utf-8") as f:
            for ligne in csv.reader(f):
                ws.append(ligne)
    classeur.save(sortie)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
