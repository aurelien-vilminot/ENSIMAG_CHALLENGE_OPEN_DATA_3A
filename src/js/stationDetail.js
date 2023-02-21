// Approx from https://www.epa.gov/sites/default/files/2016-04/documents/2012_aqi_factsheet.pdf and https://www.ecologie.gouv.fr/sites/default/files/01_Tableau-Normes-Seuils%20r%C3%A9glementaires.pdf and https://www.actu-environnement.com/ae/dictionnaire_environnement/definition/oxyde_d_azote_nox.php4
// Since most of the time, there is no threshold for the daily max value, we interpolate from recommendations
const thresholdValues = {
    SO2: {
        //OK
        mean: 50,
        max: 350,
    },
    NO2: {
        mean: 40,
        max: 200,
    },
    NO: {
        mean: 150,
        max: 400,
    },
    'NOX as NO2': {
        mean: 40,
        max: 200,
    },
    O3: {
        mean: 100,
        max: 180,
    },
    PM10: {
        mean: 40,
        max: 150,
    },
    'PM2.5': {
        mean: 12,
        max: 35,
    },
}

let lineChart,
    barChart,
    pieChart,
    dataset = []

let currentPollutant = ''

class Station {
    constructor(rowObject) {
        const row = Object.values(rowObject)
        this.id = row[0]
        this.position = [row[1], row[2]]
        this.airports = row[3].split('|')
        this.city = row[4]
        this.county = row[5]
    }

    /**
     * @param {L.Marker} marker
     */
    addPopupMarker(marker) {
        this.popupMarker = marker
    }
}

/**
 * Return data between begin and end dates
 * @param {Date} begin
 * @param {Date} end
 * @returns {Promise<void>}
 */
async function makeDataset(begin, end) {
    // Empty dataset
    dataset = []
    let currentDate = begin
    while (currentDate <= end) {
        try {
            dataset.push(await getData(`data/FR_E2_${currentDate.usFormat()}_processed.csv`))
        } catch (e) {
            // Corresponding file is not found, an error message must be displayed
            dataset = []
            displayNoDataFoundMessage()
            return
        }

        currentDate = currentDate.addDays(1)
    }
}

/**
 *
 * @param {Station} station
 * @param {Date} endDate
 * @param {number} dayRange
 */
async function displayStationGraph(station, endDate, dayRange) {
    // Some params for the plot
    const unit = 'µg-m3' // It can be changed but the dataset used only use µg-m3
    const beginDate = endDate.subDays(dayRange)

    // Load data
    makeDataset(beginDate, endDate).then(() => {
        let filteredData = {}
        let noDataFound = true
        for (const [day, dayInfo] of Object.entries(dataset)) {
            filteredData[day] = dayInfo.filter((item) => item.id === station.id)
            if (noDataFound === true && filteredData[day].length !== 0) {
                noDataFound = false
            }
        }

        // Get filterData as an array
        filteredData = Object.entries(filteredData)

        if (noDataFound === true) {
            displayNoDataFoundMessage()
            return
        }

        // Get all the different pollutants dynamically
        let pollutantNames = new Set()
        for (const [, dayInfo] of filteredData) {
            for (const infoByPollutant of dayInfo) {
                pollutantNames.add(infoByPollutant.pollutant)
            }
        }

        const data = {
            labels: [...Array(32).keys()].slice(
                endDate.getDate() - dayRange,
                endDate.getDate() + 1,
            ),
            datasets: [], // To be filled later
        }

        let datasetsToShow = []
        let pollutantSummary = {}
        let grades = {} // Stores all pollutant grades, the max correspond to the grade day
        let gradeOfDay
        let selection
        // Big loop to create a graph for each pollutant
        for (selection of pollutantNames) {
            let dataToShow = { min: [], mean: [], max: [] }
            let day = endDate.getDate() - (filteredData.length - 1)

            for (const [, dayInfo] of filteredData) {
                let foundSelection = false // Allows to know if the pollutant is present in the data
                for (const infoByPollutant of dayInfo) {
                    // We treat data of the day from the input box
                    if (day === endDate.getDate()) {
                        grades[infoByPollutant.pollutant] = infoByPollutant.note
                        if (infoByPollutant.pollutant === selection) {
                            pollutantSummary[selection] = {
                                mean: infoByPollutant.mean,
                                unit: infoByPollutant.unit,
                            }
                        }
                    }

                    if (infoByPollutant.pollutant === selection) {
                        dataToShow.mean.push(infoByPollutant.mean)
                        dataToShow.min.push(infoByPollutant.min)
                        dataToShow.max.push(infoByPollutant.max)
                        foundSelection = true
                    }
                }
                if (!foundSelection) {
                    dataToShow.mean.push(null)
                    dataToShow.min.push(null)
                    dataToShow.max.push(null)
                }

                // Calculate the grade of day
                if (day === endDate.getDate()) {
                    const gradesValues = Object.values(grades)
                    gradeOfDay = Math.max(...gradesValues)
                }

                day++
            }

            datasetsToShow.push({
                label: 'Min',
                backgroundColor: 'rgba(0, 153, 136, 1)',
                borderColor: 'rgba(0, 153, 136, 1)',
                pointStyle: 'circle',
                pointRadius: 4,
                pointHoverRadius: 7,
                data: dataToShow.min,
                fill: false,
            })
            datasetsToShow.push({
                label: 'Moyenne',
                backgroundColor: 'rgba(238, 119, 51, 1)',
                borderColor: 'rgba(238, 119, 51, 1)',
                pointStyle: 'circle',
                pointRadius: 4,
                pointHoverRadius: 7,
                data: dataToShow.mean,
                fill: false,
            })
            datasetsToShow.push({
                label: 'Max',
                backgroundColor: 'rgba(204, 51, 17, 1)',
                borderColor: 'rgba(204, 51, 17, 1)',
                pointStyle: 'circle',
                pointRadius: 4,
                pointHoverRadius: 7,
                data: dataToShow.max,
                fill: false,
            })
        }

        const config = {
            type: 'line',
            data: data,
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: '',
                    },
                    filler: {
                        propagate: false,
                    },
                },
                scales: {
                    yAxes: {
                        title: {
                            display: true,
                            text: `${selection} in ${unit}`,
                            font: {
                                size: 15,
                            },
                        },
                        ticks: {
                            precision: 0,
                        },
                    },
                    xAxes: {
                        title: {
                            display: true,
                            text: `Données du ${beginDate.frFormat()} au ${endDate.frFormat()}`,
                            font: {
                                size: 15,
                            },
                        },
                        ticks: {
                            precision: 0,
                        },
                    },
                },
                onClick: (event) => {
                    const points = lineChart.getElementsAtEventForMode(
                        event,
                        'index',
                        { intersect: false },
                        true,
                    )

                    if (points.length) {
                        // At least one curve is plotted, we can find the x value of the point that was clicked
                        const xClickedPoint = points[0].index
                        const selectedDate = beginDate.addDays(xClickedPoint)

                        const meanValue = lineChart.data.datasets[1].data[xClickedPoint]
                        const maxValue = lineChart.data.datasets[2].data[xClickedPoint]
                        displayLevelInfo(maxValue, meanValue, selectedDate)
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index',
                },
            },
        }

        displayDaySummary(pollutantSummary)
        if (gradeOfDay !== undefined) {
            displayAirGrade(gradeOfDay)
            displayPieChart(grades)
        }

        if (lineChart) {
            lineChart.destroy()
        }
        lineChart = new Chart(document.getElementById('pollutantByStation'), config)

        const buttonsDiv = document.getElementById('pollutantsButtons')
        for (const [idx, pollutantName] of Array.from(pollutantNames).entries()) {
            let buttonDiv = document.createElement('div')
            buttonDiv.className = 'col-auto'
            let button = document.createElement('button')
            button.className = 'btn btn-outline-primary'
            button.textContent = pollutantName
            button.onclick = () => {
                updateChart(datasetsToShow, pollutantNames, idx, unit)
                destroyBarChart()
                updateButtonClass(button)
            }
            buttonDiv.appendChild(button)
            buttonsDiv.appendChild(buttonDiv)
        }

        // By default, show the first pollutant
        updateChart(datasetsToShow, pollutantNames, 0, unit)
        buttonsDiv.firstChild.firstChild.className = 'btn btn-outline-primary active'
    })
}

/**
 *
 * @param {number} maxValue
 * @param {number} meanValue
 * @param {Date} selectedDate
 */
function displayLevelInfo(maxValue, meanValue, selectedDate) {
    const barChartDataset = [
        {
            label: 'Moyenne quotidienne tolérable',
            data: [thresholdValues[currentPollutant]['mean']],
            backgroundColor: 'rgba(0, 153, 136, 1)',
        },
        {
            label: 'Maximum horaire tolérable',
            data: [thresholdValues[currentPollutant]['max']],
            backgroundColor: 'rgba(238, 119, 51, 1)',
        },
        {
            label: 'Danger',
            data: [Math.max(thresholdValues[currentPollutant]['mean'] + 10, maxValue + 10)],
            backgroundColor: 'rgba(204, 51, 17, 1)',
        },
    ]

    const horizontalLineConfig = [
        {
            y: maxValue,
            style: '#000000',
            text: 'Valeur maximale atteinte ce jour',
            position: 'top',
        },
        {
            y: meanValue,
            style: '#000000',
            text: 'Valeur moyenne de ce jour',
            position: 'bottom',
        },
    ]

    const titleText = `Données journalières (${selectedDate.frFormat()})`

    if (barChart === undefined) {
        // https://jsfiddle.net/df1nyxqh/1/
        let canvas = document.getElementById('displayLevelInfo')
        canvas.style.display = 'block'
        let ctx = canvas.getContext('2d')
        let horizonalLinePlugin = {
            id: 'horizontalLine',
            afterDraw: function (chartInstance) {
                let yScale = chartInstance.scales['y']
                let index
                let line
                let style

                if (chartInstance.options.horizontalLine) {
                    for (index = 0; index < chartInstance.options.horizontalLine.length; index++) {
                        line = chartInstance.options.horizontalLine[index]

                        if (!line.style) {
                            style = 'rgba(169,169,169, .6)'
                        } else {
                            style = line.style
                        }

                        if (line.y) {
                            yValue = yScale.getPixelForValue(line.y)
                        } else {
                            yValue = 0
                        }

                        ctx.lineWidth = 3

                        if (yValue) {
                            ctx.beginPath()
                            ctx.moveTo(0, yValue)
                            ctx.lineTo(canvas.width, yValue)
                            ctx.strokeStyle = style
                            ctx.stroke()
                        }

                        if (line.text) {
                            ctx.fillStyle = style
                            if (line.position === 'top') {
                                ctx.fillText(line.text, 200, yValue - ctx.lineWidth * 5)
                            } else if (line.position === 'bottom') {
                                ctx.fillText(line.text, 200, yValue + ctx.lineWidth * 5)
                            }
                        }
                    }
                }
            },
        }

        // We create a new chart
        const labels = ['']
        const data = {
            labels: labels,
            datasets: barChartDataset,
        }

        const config = {
            type: 'bar',
            data: data,
            options: {
                plugins: {
                    title: {
                        display: true,
                        text: titleText,
                    },
                    legend: {
                        position: 'bottom',
                    },
                },
                responsive: true,
                scales: {
                    x: {
                        stacked: true,
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: true,
                            font: {
                                size: 15,
                            },
                            text: `${currentPollutant} en µg/m3`,
                        },
                    },
                },
                horizontalLine: horizontalLineConfig,
                animation: false,
            },
        }
        Chart.register(horizonalLinePlugin)
        barChart = new Chart(document.getElementById('displayLevelInfo'), config)
    } else {
        barChart.data.datasets = barChartDataset
        barChart.config.options.horizontalLine = horizontalLineConfig
        barChart.config.options.plugins.title.text = titleText
        barChart.update()
    }
}

function updateChart(dataSetToShow, pollutantNames, idx, unit) {
    lineChart.data.datasets = dataSetToShow.slice(idx * 3, idx * 3 + 3)
    lineChart.config.options.scales.yAxes.title.text = `${
        Array.from(pollutantNames)[idx]
    } en ${unit}`
    lineChart.config.options.plugins.title.text = `Évolution de la concentration de ${
        Array.from(pollutantNames)[idx]
    } au cours du temps`
    lineChart.update()
    currentPollutant = Array.from(pollutantNames)[idx]
}

/**
 *
 * @param {Element} currentButton
 */
function updateButtonClass(currentButton) {
    currentButton.className = 'btn btn-outline-primary active'
    const otherDivButtons = document.getElementById('pollutantsButtons').children
    for (let divButton of otherDivButtons) {
        let button = divButton.firstChild
        if (button !== currentButton) {
            button.className = 'btn btn-outline-primary'
        }
    }
}

function destroyBarChart() {
    // Delete barChart
    if (barChart !== undefined) {
        barChart.destroy()
        barChart = undefined
    }
}

function destroyLineChart() {
    if (lineChart !== undefined) {
        lineChart.destroy()
        lineChart = undefined
    }
}

function destroyPieChart() {
    if (pieChart !== undefined) {
        pieChart.destroy()
        pieChart = undefined
    }
}

function destroyChart() {
    destroyLineChart()
    destroyBarChart()
    destroyPieChart()

    document.getElementById('airportsList').innerHTML = ''
    document.getElementById('pollutantsList').innerHTML = ''
    document.getElementById('pollutantsButtons').innerHTML = ''
    document.getElementById('interpretation').innerHTML = ''

    document.getElementById('noDataFoundMessage').style.display = 'none'
    document.getElementById('airGrade').style.display = 'none'
    document.getElementById('interpretationDiv').style.display = 'none'
    document.getElementById('pollutantByStationDiv').style.display = 'none'
    document.getElementById('displayLevelInfo').style.display = 'none'
    document.getElementById('pollutantsTitle').style.display = 'none'
}

function displayNoDataFoundMessage() {
    document.getElementById('noDataFoundMessage').style.display = 'block'
    document.getElementById('pollutantByStation').style.display = 'none'
    document.getElementById('airGrade').style.display = 'none'
    document.getElementById('interpretationDiv').style.display = 'none'
    document.getElementById('pollutantsTitle').style.display = 'none'
}

function displayData() {
    document.getElementById('noDataFoundMessage').style.display = 'none'
    document.getElementById('pollutantByStationDiv').style.display = 'block'
    document.getElementById('pollutantsTitle').style.display = 'block'
    document.getElementById('pollutantByStation').style.display = 'block'
    document.getElementById('airGrade').style.display = 'flex'
    document.getElementById('interpretationDiv').style.display = 'block'
    document.getElementById('pieChart').style.display = 'block'
}

function displayDaySummary(pollutantSummary) {
    // Create pollutants list
    const pollutantsList = document.getElementById('pollutantsList')

    for (let pollutant in pollutantSummary) {
        const pollutantElement = document.createElement('li')
        pollutantElement.className = 'list-group-item'
        pollutantElement.textContent = `${pollutant} : ${pollutantSummary[pollutant].mean} ${pollutantSummary[pollutant].unit}`
        pollutantsList.appendChild(pollutantElement)
    }
}

/**
 *
 * @param {number} gradeOfDay
 */
function displayAirGrade(gradeOfDay) {
    const gradePicture = document.getElementById('airGradeEmoji')
    gradePicture.src = `img/grade_${gradeOfDay}.PNG`
    gradePicture.title = `Note : ${gradeOfDay}/6`
    updateInterpretationAirGrade(gradeOfDay)
}

/**
 *
 * @param {number} gradeOfDay
 */
function updateInterpretationAirGrade(gradeOfDay) {
    const interpretationTexts = {
        grade: [
            'bonne',
            'moyenne',
            'dégradée',
            'mauvaise',
            'très mauvaise',
            'extrêmement mauvaise',
        ],
    }

    let textContent = `La qualité de l'air est ${interpretationTexts.grade[gradeOfDay - 1]}. `
    if (gradeOfDay < 3) {
        textContent += 'Vous pouvez vous divertir en extérieur sans problème. '
    } else {
        textContent +=
            "Il est recommandé de ne pas sortir à l'extérieur, notamment pour faire une activité physique . "
    }

    const text = document.getElementById('interpretation')
    text.textContent += textContent
}

/**
 *
 * @param {Object} grades
 */
function displayPieChart(grades) {
    const data = {
        labels: Object.keys(grades),
        datasets: [
            {
                data: Object.values(grades),
                backgroundColor: [
                    'rgb(0, 119, 187)',
                    'rgb(51, 187, 238)',
                    'rgb(0, 153, 136)',
                    'rgb(238, 119, 51)',
                    'rgb(204, 51, 17)',
                    'rgb(238, 51, 119)',
                    'rgb(187, 187, 187)',
                ],
                hoverOffset: 4,
            },
        ],
    }

    const config = {
        type: 'pie',
        data: data,
        options: {
            plugins: {
                title: {
                    display: true,
                    text: "Influence des polluants sur la qualité de l'air ",
                },
                legend: {
                    position: 'bottom',
                },
            },
            responsive: true,
        },
    }

    const pieChartDiv = document.getElementById('pieChart')
    pieChart = new Chart(pieChartDiv, config)
}
