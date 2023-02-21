let map, heatmap, stationMarkers, activeStation, stations, counties
const DEFAULT_ZOOM = 6
const MIN_ZOOM = 5
const STATION_ZOOM = 13
const EMPTY_SELECT_STATION_TEXT = 'Sélectionner une station...'

/**
 * @param {Station} station
 * @param {Date} date
 */
const showStationData = async (station, date) => {
    if (!station) return

    let selectList = document.getElementById('day-range')
    let dayRange = selectList.options[selectList.selectedIndex].value

    displayStationGraph(station, date, parseInt(dayRange)).then(() => {
        displayData()

        const stationTitle = document.getElementById('stationTitle')
        stationTitle.textContent = `Station ${station.id} (${date.frFormat()})`
        if (station.airports[0].length > 0) {
            const airportText = document.getElementById('airportsList')
            airportText.textContent = `Aéroport(s) à proximité : ${station.airports}`

            const interpretationText = document.getElementById('interpretation')
            interpretationText.textContent +=
                'Un ou plusieurs aéroports se situent à proximité de la station. ' +
                "Cela peut influer sur la mesure des polluants et donc sur la qualité de l'air induite. "
        }
    })
}

const setActiveStation = (station) => {
    activeStation = station
    setStationSelectorText(station ? station.id : '')
}

/**
 * @param {Station} station
 */
const onStationFocus = (station) => {
    if (activeStation === station && station.popupMarker.isPopupOpen()) return
    setActiveStation(station)
    enableFocusStationButton()
    const date = new Date(document.getElementById('date-selector').value)
    destroyChart()
    showStationData(station, date).then(() => {
        // re-evaluate map size after its container resized
        map.invalidateSize()
        map.setView(station.position)
        if (!station.popupMarker.isPopupOpen()) {
            station.popupMarker.openPopup()
        }
        // stationMarkers.disableClustering()
    })
}

const onStationLeave = () => {
    destroyChart()
    disableFocusStationButton()
    // re-evaluate map size after its container resized
    map.invalidateSize()
    setActiveStation(null)
}

const focusOnStation = (station) => {
    if (map !== undefined) {
        if (station !== undefined && station.position !== undefined) {
            map.setView(station.position, STATION_ZOOM)
            onStationFocus(station)
        } else if (activeStation !== undefined && activeStation.position !== undefined) {
            map.setView(activeStation.position, STATION_ZOOM)
        }
    }
}

const addStation = (station) => {
    // https://github.com/pointhi/leaflet-color-markers
    const redIcon = new L.Icon({
        iconUrl:
            'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
    })
    const popupText = `Station (${station.id})`
    const popupHtml = `<div class="station">Station (${station.id})</div>`
    const popup = L.popup({}).setContent(popupHtml)
    const marker = L.marker(station.position, { icon: redIcon, alt: popupText }).bindPopup(popup)

    marker.addEventListener('popupopen', () => onStationFocus(station))
    marker.addEventListener('popupclose', () => onStationLeave())

    station.addPopupMarker(marker)
    stationMarkers.addLayer(marker)
    return marker
}
const setupStations = async () => {
    const stations_data = await getData('data/stations_coords_processed.csv')
    stations = {}
    counties = {}

    let county
    let city
    for (const stationRow of stations_data) {
        const station = new Station(stationRow)
        addStation(station)
        stations[station['id']] = station

        county = stationRow['County Name']
        city = stationRow['City']

        if (!(county in counties)) {
            counties[county] = {}
        }
        if (!(city in counties[county])) {
            counties[county][city] = []
        }
        counties[county][city].push(station)
    }
}

const setupStationSelector = () => {
    const data = []

    for ([county, cities] of Object.entries(counties).sort()) {
        const countyObject = { text: `${county}`, children: [] }
        data.push(countyObject)
        for ([city, city_stations] of Object.entries(cities).sort()) {
            const cityObject = { text: `${city}`, children: [] }
            countyObject.children.push(cityObject)
            for (let station of city_stations) {
                const stationObject = { id: station.id, text: `${station.id}`, station: station }
                cityObject.children.push(stationObject)
            }
        }
    }

    const matchCustom = (params, data) => {
        // If there are no search terms, return all the data
        if ($.trim(params.term) === '') {
            return data
        }

        // Do not display the item if there is no 'text' property
        if (typeof data.text === 'undefined') {
            return null
        }

        // `params.term` should be the term that is used for searching
        // `data.text` is the text that is displayed for the data object
        if (data.text.toLowerCase().indexOf(params.term.toLowerCase()) > -1) {
            // matches on data.text
            return $.extend({}, data, true)
        } else {
            // matches on every data.children[i].text
            const modifiedData = $.extend({}, data, true)
            const children = []
            for (const child of data.children) {
                if (child.text.toLowerCase().indexOf(params.term.toLowerCase()) > -1) {
                    const modifiedChild = $.extend({}, child, true)
                    children.push(modifiedChild)
                }
            }
            if (children.length > 0) {
                modifiedData.children = children
                return modifiedData
            }
        }

        // Return `null` if the term should not be displayed
        return null
    }

    const $stationSelector = $('#station-selector').select2({
        data: data,
        matcher: matchCustom,
        selectOnClose: false,
        placeholder: EMPTY_SELECT_STATION_TEXT,
    })

    $stationSelector.on('select2:select', (e) => {
        const data = e.params.data
        focusOnStation(data.station)
    })
}

const setStationSelectorText = (text) => {
    const $stationSelectorContainer = $('#select2-station-selector-container')
    $stationSelectorContainer.attr('title', text)
    $stationSelectorContainer.text(text)

    if (!text) {
        const placeholder = document.createElement('span')
        placeholder.className = 'select2-selection__placeholder'
        placeholder.textContent = EMPTY_SELECT_STATION_TEXT
        $stationSelectorContainer.append(placeholder)
    }
}

const setupHeatMap = (date) => {
    makeDataset(date, date).then(() => {
        // Compute every station grade
        let stations_grades = {}
        let id
        let grade
        for (let station of dataset[0]) {
            id = station['id']
            grade = station['note']
            if (!(id in stations_grades)) {
                stations_grades[id] = -1
            }
            stations_grades[id] = Math.max(stations_grades[id], grade)
        }

        // Add every station grade to the heat map
        let grades = [],
            lat,
            long
        for ([id, grade] of Object.entries(stations_grades)) {
            lat = stations[id].position[0]
            long = stations[id].position[1]
            grades.push({ lat: lat, lng: long, value: grade })
        }

        let data = {
            max: 5,
            data: grades,
        }

        let cfg = {
            // radius should be small ONLY if scaleRadius is true (or small radius is intended)
            radius: 0.5,
            maxOpacity: 0.7,
            // scales the radius based on map zoom
            scaleRadius: true,
            // if set to false the heatmap uses the global maximum for colorization
            // if activated: uses the data maximum within the current map boundaries
            //   (there will always be a red spot with useLocalExtremas true)
            useLocalExtrema: false,
            // which field name in your data represents the latitude - default "lat"
            latField: 'lat',
            // which field name in your data represents the longitude - default "lng"
            lngField: 'lng',
            // which field name in your data represents the data value - default "value"
            valueField: 'value',
        }

        if (heatmap === undefined) {
            heatmap = new HeatmapOverlay(cfg)
            heatmap.addTo(map)
        }
        heatmap.setData(data)
    })
}

const setupMap = () => {
    // Initialize map
    const southWest = L.latLng(-89.98155760646617, -180)
    const northEast = L.latLng(89.99346179538875, 180)
    const bounds = L.latLngBounds(southWest, northEast)
    map = L.map('map', {
        center: [48.891666, 2.346667],
        zoom: DEFAULT_ZOOM,
        maxBounds: bounds,
        maxBoundsViscosity: 1.0,
    })
    stationMarkers = L.markerClusterGroup({ disableClusteringAtZoom: STATION_ZOOM })
    map.setView([48.891666, 2.346667], MIN_ZOOM)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        minNativeZoom: MIN_ZOOM,
        minZoom: MIN_ZOOM,
        attribution: '© OpenStreetMap',
    }).addTo(map)

    // Setup layers
    setupStations().then(() => {
        setupStationSelector()
        setupHeatMap(new Date(document.getElementById('date-selector').value))
    })

    // Add layers to map
    map.addLayer(stationMarkers)
}

const setupWidgets = () => {
    const dateSelector = document.getElementById('date-selector')
    dateSelector.addEventListener('change', () => {
        const date = new Date(dateSelector.value)
        destroyChart()
        showStationData(activeStation, date)
        setupHeatMap(date)
    })

    const dayRangeSelector = document.getElementById('day-range')
    dayRangeSelector.addEventListener('change', () => {
        const date = new Date(dateSelector.value)
        destroyChart()
        showStationData(activeStation, date)
    })
}

setupMap()
setupWidgets()
