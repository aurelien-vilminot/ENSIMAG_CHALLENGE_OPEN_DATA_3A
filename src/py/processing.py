#!/usr/bin/env python3

import csv
import sys
from pathlib import Path
from statistics import mean, median, stdev


class Indexes:
    # Data files
    DATE_DEBUT = 0
    DATE_FIN = 1
    ORGANISME = 2
    CODE_ZAS = 3
    ZAS = 4
    CODE_SITE = 5
    NOM_SITE = 6
    TYPE_IMPL = 7
    POLLUANT = 8
    TYPE_INFL = 9
    DISCRI = 10
    REGL = 11
    TYPE_EVAL = 12
    PROC_MESURE = 13
    TYPE_VAL = 14
    VAL = 15
    VAL_BRUTE = 16
    UNITE = 17
    TAUX_SAISIE = 18
    COUV_TEMP = 19
    COUV_DATA = 20
    CODE_QUAL = 21
    VALID = 22
    # Coords files
    COORDS_CODE_SITE = 0
    COORDS_LATITUDE = 1
    COORDS_LONGITUDE = 2


class Station:
    id: str
    name: str
    coords: tuple[str, str]
    pollutants: dict[str, "PollutantInfo"]
    pollutants_notes = {
        "O3": [50, 100, 130, 240, 380],
        "NO": [200, 45, 600, 1150, 1700],
        "NO2": [40, 90, 120, 230, 340],
        "NOX as NO2": [40, 90, 120, 230, 340],
        "SO2": [100, 200, 350, 500, 750],
        "PM2.5": [10, 20, 25, 50, 75],
        "PM10": [20, 40, 50, 100, 150]
    }

    def __init__(self, id: str, name: str, coords: tuple[str, str]) -> None:
        self.id = id
        self.name = name
        self.coords = coords
        self.pollutants = dict()

    def __repr__(self) -> str:
        return f"{self.name}:\n{self.pollutants}\n"

    def compute_stats(self) -> None:
        for info in self.pollutants.values():
            if len(info.values):
                info.mean = round(mean(info.values), 3)
                info.median = round(median(info.values), 3)
                info.stdev = round(stdev(info.values), 3) if len(info.values) > 1 else 0
                info.min = round(min(info.values), 3)
                info.max = round(max(info.values), 3)

    def compute_note(self) -> None:
        for pollutant, info in self.pollutants.items():
            info.note = 0
            try:
                notes_array = self.pollutants_notes[pollutant]
            except KeyError:
                # If the pollutant cannot be graded
                continue

            is_pm_pollutant = pollutant in ("PM2.5", "PM10")
            for note, value in enumerate(notes_array):
                if is_pm_pollutant and info.mean < value:
                    info.note = note + 1
                    break
                elif info.max < value:
                    info.note = note + 1
                    break

            info.note = info.note if info.note != 0 else 6


class PollutantInfo:
    values: list[float]
    mean: float = -1
    median: float = -1
    stdev: float = -1
    min: float = -1
    max: float = -1
    unit: str = "mg-m3"
    note: int = 0

    def __init__(self) -> None:
        self.values = list()

    def __repr__(self) -> str:
        return f"\tMean: {self.mean:.2f}, median: {self.median:.2f}, stdev: {self.stdev:.2f}, unit: {self.unit}, nb_stations: {len(self.values)}\n"


class DataProcessor:
    def __init__(self) -> None:
        self._stations = dict()
        self._stations_coords = dict()

    def process(self, csv_name: str) -> None:
        self._stations = dict()
        if not self._stations_coords:
            self._generate_stations_coords(self._stations_coords_path)
        self._read_csv(csv_name)
        self._compute_stations_stats()
        self._compute_stations_note()
        self._write_csv(csv_name)

    # --- Private API

    _stations: dict[str, Station]
    _stations_coords: dict[str, tuple[str, str]]

    # The right way to manage path is to use pathlib.Path, and the parent option (prevent /./ to appear and can be
    # "tranvelled")
    current_path = Path(__file__)
    _stations_coords_path: Path = current_path.parent.parent / \
                                  "data" / "stations_coords.csv"

    def _read_csv(self, csv_name: str) -> None:
        with open(csv_name) as csv_file:
            csv_reader = csv.reader(csv_file, delimiter=";")
            next(csv_reader)

            for row in csv_reader:
                station_id = row[Indexes.CODE_SITE]
                # Verify that the station exists in our mapping table.
                if station_id not in self._stations_coords:
                    # print(station_id, "wasn't in the stations coordinates file.")
                    continue

                station_name = row[Indexes.NOM_SITE]
                coords = self._stations_coords[station_id]
                pollutant = row[Indexes.POLLUANT]
                value = row[Indexes.VAL_BRUTE]
                unit = row[Indexes.UNITE]

                # If the station doesn't exist yet, create it.
                if station_id not in self._stations:
                    self._stations[station_id] = Station(
                        id=station_id, name=station_name, coords=coords
                    )

                current_station = self._stations[station_id]

                # Verify the validity of the value.
                if value != "" and float(value) >= 0:
                    # If the pollutant doesn't exist for the current station
                    # yet, create it.
                    if pollutant not in current_station.pollutants:
                        current_station.pollutants[pollutant] = PollutantInfo()
                    current_station.pollutants[pollutant].values.append(
                        float(value))
                    current_station.pollutants[pollutant].unit = unit

    def _compute_stations_stats(self):
        for station in self._stations.values():
            station.compute_stats()

    def _compute_stations_note(self):
        for station in self._stations.values():
            station.compute_note()

    def _write_csv(self, csv_name: str) -> None:
        with open(csv_name[:-4] + "_processed.csv", mode="w") as csv_file:
            writer = csv.writer(
                csv_file, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL
            )
            # write header (1st row)
            writer.writerow(
                ["id", "name", "pollutant",
                 "mean", "median", "stdev", "min", "max", "unit", "note"]
            )

            # write data
            for station in self._stations.values():
                for pollutant, info in station.pollutants.items():
                    writer.writerow(
                        [
                            station.id,
                            station.name,
                            pollutant,
                            info.mean,
                            info.median,
                            info.stdev,
                            info.min,
                            info.max,
                            info.unit,
                            info.note,
                        ]
                    )

    def _generate_stations_coords(self, csv_name: Path) -> None:
        with open(csv_name) as csv_file:
            csv_reader = csv.reader(csv_file, delimiter=",")
            next(csv_reader)

            for row in csv_reader:
                self._stations_coords[row[Indexes.COORDS_CODE_SITE]] = (
                    row[Indexes.COORDS_LATITUDE], row[Indexes.COORDS_LONGITUDE])


if __name__ == "__main__":
    processor = DataProcessor()
    assert len(sys.argv) == 2
    processor.process(sys.argv[1])
