#!/usr/bin/env python3

import os
import sys
from glob import glob

import requests
from datetime import datetime, timedelta
from pathlib import Path


class CsvFilesManager:

    def __init__(self) -> None:
        self.base_url = "https://files.data.gouv.fr/lcsqa/concentrations-de-polluants-atmospheriques-reglementes/temps-reel/"

    def get_csv_from_dates(self, begin: str, end: str = None) -> []:
        if end is None:
            end = begin

        self.__check_dates(begin, end)
        csv_files_name = []
        current_date = self.begin_date
        while current_date <= self.end_date:
            file_name = f"FR_E2_{current_date.strftime('%Y-%m-%d')}.csv"
            url = f"{self.base_url}/{current_date.year}/{file_name}"

            request = requests.get(url)

            file_path = Path(__file__).parent.parent / "data" / f"{file_name}"
            with open(file_path, "wb") as csv_file:
                csv_file.write(request.content)

            csv_files_name.append(file_name)
            current_date = current_date + timedelta(days=1)

        return csv_files_name

    @staticmethod
    def remove_useless_csv_files() -> None:
        reg_exp_path = Path(__file__).parent.parent / "data" / f"*[0-9][0-9].csv"
        for file in glob(reg_exp_path.__str__()):
            os.remove(file)

    def __check_dates(self, begin_str: str, end_str: str) -> None:
        try:
            self.begin_date = datetime.strptime(begin_str, '%Y-%m-%d')
            self.end_date = datetime.strptime(end_str, '%Y-%m-%d')

            assert self.begin_date.year in (2021, 2022) and self.end_date.year in (2021, 2022)
            assert self.begin_date <= datetime.now() and self.end_date <= datetime.now()
            assert self.begin_date <= self.end_date
        except ValueError as err:
            print(err.args, file=sys.stderr)
            exit(-1)


# py ./csv_files_manager.py 2022-09-15 2022-09-20
if __name__ == "__main__":
    processor = CsvFilesManager()
    assert len(sys.argv) == 3
    processor.get_csv_from_dates(sys.argv[1], sys.argv[2])
