#!/usr/bin/env python3
import os.path
import sys
from pathlib import Path

from csv_files_manager import CsvFilesManager
from processing import DataProcessor
from airport import AirportProcessor
from county import CountyProcessor

# For one day: ./main.py 2022-09-15
# For different days: ./main.py 2022-09-15 2022-09-20
if __name__ == "__main__":
    assert len(sys.argv) == 2 or len(sys.argv) == 3

    if not os.path.exists(Path(__file__).parent.parent / "data" / "stations_coords_processed.csv"):
        airport_processor = AirportProcessor()
        airport_processor.process()

        county_processor = CountyProcessor()
        county_processor.process()

    file_manager = CsvFilesManager()
    if len(sys.argv) == 2:
        csv_files = file_manager.get_csv_from_dates(sys.argv[1])
    else:
        csv_files = file_manager.get_csv_from_dates(sys.argv[1], sys.argv[2])

    processor = DataProcessor()
    for file_name in csv_files:
        file_path = Path(__file__).parent.parent / "data" / f"{file_name}"
        processor.process(file_path.__str__())

    file_manager.remove_useless_csv_files()
