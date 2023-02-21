#!/usr/bin/env python3

import csv
import json
import requests
from pathlib import Path


class CountyProcessor:

    def process(self) -> None:
        csv_rows = []
        with open(self._stations_coords_path) as csv_in_file:
            csv_reader = csv.reader(csv_in_file, delimiter=",")
            next(csv_reader)
            csv_rows.extend(csv_reader)

        with open(self._stations_coords_processed_path, mode="w") as csv_out_file:
            writer = csv.writer(
                csv_out_file, delimiter=",", quotechar='"', quoting=csv.QUOTE_MINIMAL
            )

            # write header
            writer.writerow(
                ["Station ID", "Latitude", "Longitude", "Airport", "City", "County #", "County Name"]
            )

            for row in csv_rows:
                station = row[0]
                latitude = row[1]
                longitude = row[2]
                airport = row[3]

                # County #
                url = f"{self._nbr_base_url}?lat={latitude}&lon={longitude}"
                response = requests.get(url)
                infos = json.loads(response.content[1:-1])

                city = infos["nom"]
                county_nbr = infos["codeDepartement"]

                # County name
                url = f"{self._name_base_url}/{county_nbr}"
                response = requests.get(url)
                infos = json.loads(response.content)

                county_name = infos["nom"]

                writer.writerow([station, latitude, longitude, airport, city, county_nbr, county_name])

    # --- Private API

    _nbr_base_url = "https://geo.api.gouv.fr/communes"
    _name_base_url = "https://geo.api.gouv.fr/departements"
    _current_path = Path(__file__)
    _stations_coords_path: Path = _current_path.parent.parent / \
                                  "data" / "stations_coords.csv"
    _stations_coords_processed_path: Path = _current_path.parent.parent / \
                                  "data" / "stations_coords_processed.csv"


if __name__ == "__main__":
    processor = CountyProcessor()
    processor.process()
