async function getData(filename) {
    return d3.csv(filename, function (line) {
        return line
    })
}

function onDataVisualisationButtonClicked(button) {
    button.className = 'nav-link active'
    document.getElementById('reportButton').className = 'nav-link'
    document.getElementById('dataVisualisationContainer').style.display = 'block'
    document.getElementById('reportContainer').style.display = 'none'
}
function onReportButtonClicked(button) {
    button.className = 'nav-link active'
    document.getElementById('dataVisualisationButton').className = 'nav-link'
    document.getElementById('reportContainer').style.display = 'block'
    document.getElementById('dataVisualisationContainer').style.display = 'none'
}

Date.prototype.subDays = function (days) {
    let date = new Date(this.valueOf())
    date.setDate(date.getDate() - days)
    return date
}

Date.prototype.addDays = function (days) {
    let date = new Date(this.valueOf())
    date.setDate(date.getDate() + days)
    return date
}

// 2022-02-15
Date.prototype.usFormat = function () {
    let date = new Date(this.valueOf())
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate(),
    ).padStart(2, '0')}`
}

// 15-02-2022
Date.prototype.frFormat = function () {
    let date = new Date(this.valueOf())
    return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(
        2,
        '0',
    )}-${date.getFullYear()}`
}

function enableFocusStationButton() {
    const button = document.getElementById('focusStationButton')
    button.style.display = 'block'
}

function disableFocusStationButton() {
    const button = document.getElementById('focusStationButton')
    button.style.display = 'none'
}
