#!/usr/bin/env python3

import csv
from pathlib import Path
import pandas
import re
import haversine

MIN_DIST = 18


class AirportProcessor:
    def __init__(self):
        self.airport_list = []

    def process(self):
        self.clean_airport_data()
        self.write_airport_data()

    def clean_airport_data(self):
        airports_file_path = Path(__file__).parent.parent / "data/airports.xlsx"
        df = pandas.read_excel(airports_file_path)

        with open(Path(__file__).parent.parent / "data/airports.csv", mode="w") as csv_file:
            writer = csv.writer(csv_file, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL)

            # write header
            writer.writerow(["Name", "Latitude", "Longitude"])

            # write data
            for airport in df.loc:
                coords = (
                    self._dms2dec(airport["Latitude (°,',\")"]),
                    self._dms2dec(airport["Longitude (°,',\")"])
                )

                self.airport_list.append([
                    airport["Nom aéroport"],
                    coords[0],
                    coords[1]
                ])

                writer.writerow([
                    airport["Nom aéroport"],
                    coords[0],
                    coords[1]
                ])

                # Exit loop
                if airport.name == 89:
                    return

    def write_airport_data(self) -> None:
        new_station_coord_row = []

        with open(Path(__file__).parent.parent / "data/stations_coords.csv") as csv_file:
            csv_reader = csv.reader(csv_file, delimiter=",")
            next(csv_reader)

            for station in csv_reader:
                airport_list = ""
                for airport in self.airport_list:
                    distance = haversine.haversine((airport[1], airport[2]), (float(station[1]), float(station[2])))
                    if distance <= MIN_DIST:
                        airport_list += airport[0] if len(airport_list) == 0 else f"|{airport[0]}"

                new_station_coord_row.append([
                    station[0],
                    station[1],
                    station[2],
                    airport_list
                ])

        with open(Path(__file__).parent.parent / "data/stations_coords.csv", mode="w") as csv_file:
            writer = csv.writer(csv_file, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL)

            # write header
            writer.writerow(["Station ID", "Latitude", "Longitude", "Airport"])

            for row in new_station_coord_row:
                writer.writerow(row)

    @staticmethod
    def _dms2dec(dms):
        """
        Return decimal representation of DMS (degree minutes seconds)
        """
        sign = -1 if dms[0] == '-' else 1
        dms_numbers = re.findall("[0-9]+", dms)
        return sign * (int(dms_numbers[0]) + (int(dms_numbers[1]) / 60) + (int(dms_numbers[2]) / 3600))


if __name__ == "__main__":
    processor = AirportProcessor()
    processor.process()
