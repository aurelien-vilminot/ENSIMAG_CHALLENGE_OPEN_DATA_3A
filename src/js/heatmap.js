/*
 * heatmap.js v2.0.5 | JavaScript Heatmap Library
 *
 * Copyright 2008-2016 Patrick Wied <heatmapjs@patrick-wied.at> - All rights reserved.
 * Dual licensed under MIT and Beerware license
 *
 * :: 2016-09-05 01:16
 */
// https://github.com/pa7/heatmap.js
;(function (name, context, factory) {
    // Supports UMD. AMD, CommonJS/Node.js and browser context
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory()
    } else if (typeof define === 'function' && define.amd) {
        define(factory)
    } else {
        context[name] = factory()
    }
})('h337', this, function () {
    // Heatmap Config stores default values and will be merged with instance config
    let HeatmapConfig = {
        defaultRadius: 40,
        defaultRenderer: 'canvas2d',
        // defaultGradient: {
        //     0.25: 'rgb(0,0,255)',
        //     0.55: 'rgb(0,255,0)',
        //     0.85: 'yellow',
        //     1.0: 'rgb(255,0,0)',
        // },
        defaultGradient: {
            0.25: 'rgb(54,75,154)',
            0.55: 'rgb(152,202,225)',
            0.85: 'rgb(253,179,102)',
            1.0: 'rgb(165,0,38)',
        },
        defaultMaxOpacity: 1,
        defaultMinOpacity: 0,
        defaultBlur: 0.85,
        defaultXField: 'x',
        defaultYField: 'y',
        defaultValueField: 'value',
        plugins: {},
    }
    let Store = (function StoreClosure() {
        let Store = function Store(config) {
            this._coordinator = {}
            this._data = []
            this._radi = []
            this._min = 10
            this._max = 1
            this._xField = config['xField'] || config.defaultXField
            this._yField = config['yField'] || config.defaultYField
            this._valueField = config['valueField'] || config.defaultValueField

            if (config['radius']) {
                this._cfgRadius = config['radius']
            }
        }

        let defaultRadius = HeatmapConfig.defaultRadius

        Store.prototype = {
            // when forceRender = false -> called from setData, omits renderall event
            _organiseData: function (dataPoint, forceRender) {
                let x = dataPoint[this._xField]
                let y = dataPoint[this._yField]
                let radi = this._radi
                let store = this._data
                let max = this._max
                let min = this._min
                let value = dataPoint[this._valueField] || 1
                let radius = dataPoint.radius || this._cfgRadius || defaultRadius

                if (!store[x]) {
                    store[x] = []
                    radi[x] = []
                }

                if (!store[x][y]) {
                    store[x][y] = value
                    radi[x][y] = radius
                } else {
                    store[x][y] += value
                }
                let storedVal = store[x][y]

                if (storedVal > max) {
                    if (!forceRender) {
                        this._max = storedVal
                    } else {
                        this.setDataMax(storedVal)
                    }
                    return false
                } else if (storedVal < min) {
                    if (!forceRender) {
                        this._min = storedVal
                    } else {
                        this.setDataMin(storedVal)
                    }
                    return false
                } else {
                    return {
                        x: x,
                        y: y,
                        value: value,
                        radius: radius,
                        min: min,
                        max: max,
                    }
                }
            },
            _unOrganizeData: function () {
                let unorganizedData = []
                let data = this._data
                let radi = this._radi

                for (let x in data) {
                    for (let y in data[x]) {
                        unorganizedData.push({
                            x: x,
                            y: y,
                            radius: radi[x][y],
                            value: data[x][y],
                        })
                    }
                }
                return {
                    min: this._min,
                    max: this._max,
                    data: unorganizedData,
                }
            },
            _onExtremaChange: function () {
                this._coordinator.emit('extremachange', {
                    min: this._min,
                    max: this._max,
                })
            },
            addData: function () {
                if (arguments[0].length > 0) {
                    let dataArr = arguments[0]
                    let dataLen = dataArr.length
                    while (dataLen--) {
                        this.addData.call(this, dataArr[dataLen])
                    }
                } else {
                    // add to store
                    let organisedEntry = this._organiseData(arguments[0], true)
                    if (organisedEntry) {
                        // if it's the first datapoint initialize the extremas with it
                        if (this._data.length === 0) {
                            this._min = this._max = organisedEntry.value
                        }
                        this._coordinator.emit('renderpartial', {
                            min: this._min,
                            max: this._max,
                            data: [organisedEntry],
                        })
                    }
                }
                return this
            },
            setData: function (data) {
                let dataPoints = data.data
                let pointsLen = dataPoints.length

                // reset data arrays
                this._data = []
                this._radi = []

                for (let i = 0; i < pointsLen; i++) {
                    this._organiseData(dataPoints[i], false)
                }
                this._max = data.max
                this._min = data.min || 0

                this._onExtremaChange()
                this._coordinator.emit('renderall', this._getInternalData())
                return this
            },
            removeData: function () {
                // TODO: implement
            },
            setDataMax: function (max) {
                this._max = max
                this._onExtremaChange()
                this._coordinator.emit('renderall', this._getInternalData())
                return this
            },
            setDataMin: function (min) {
                this._min = min
                this._onExtremaChange()
                this._coordinator.emit('renderall', this._getInternalData())
                return this
            },
            setCoordinator: function (coordinator) {
                this._coordinator = coordinator
            },
            _getInternalData: function () {
                return {
                    max: this._max,
                    min: this._min,
                    data: this._data,
                    radi: this._radi,
                }
            },
            getData: function () {
                return this._unOrganizeData()
            } /*,

      TODO: rethink.

    getValueAt: function(point) {
      var value;
      var radius = 100;
      var x = point.x;
      var y = point.y;
      var data = this._data;

      if (data[x] && data[x][y]) {
        return data[x][y];
      } else {
        var values = [];
        // radial search for datapoints based on default radius
        for(var distance = 1; distance < radius; distance++) {
          var neighbors = distance * 2 +1;
          var startX = x - distance;
          var startY = y - distance;

          for(var i = 0; i < neighbors; i++) {
            for (var o = 0; o < neighbors; o++) {
              if ((i == 0 || i == neighbors-1) || (o == 0 || o == neighbors-1)) {
                if (data[startY+i] && data[startY+i][startX+o]) {
                  values.push(data[startY+i][startX+o]);
                }
              } else {
                continue;
              }
            }
          }
        }
        if (values.length > 0) {
          return Math.max.apply(Math, values);
        }
      }
      return false;
    }*/,
        }

        return Store
    })()

    let Canvas2dRenderer = (function Canvas2dRendererClosure() {
        let _getColorPalette = function (config) {
            let gradientConfig = config.gradient || config.defaultGradient
            let paletteCanvas = document.createElement('canvas')
            let paletteCtx = paletteCanvas.getContext('2d')

            paletteCanvas.width = 256
            paletteCanvas.height = 1

            let gradient = paletteCtx.createLinearGradient(0, 0, 256, 1)
            for (let key in gradientConfig) {
                gradient.addColorStop(key, gradientConfig[key])
            }

            paletteCtx.fillStyle = gradient
            paletteCtx.fillRect(0, 0, 256, 1)

            return paletteCtx.getImageData(0, 0, 256, 1).data
        }

        let _getPointTemplate = function (radius, blurFactor) {
            let tplCanvas = document.createElement('canvas')
            let tplCtx = tplCanvas.getContext('2d')
            let x = radius
            let y = radius
            tplCanvas.width = tplCanvas.height = radius * 2

            if (blurFactor == 1) {
                tplCtx.beginPath()
                tplCtx.arc(x, y, radius, 0, 2 * Math.PI, false)
                tplCtx.fillStyle = 'rgba(0,0,0,1)'
                tplCtx.fill()
            } else {
                let gradient = tplCtx.createRadialGradient(x, y, radius * blurFactor, x, y, radius)
                gradient.addColorStop(0, 'rgba(0,0,0,1)')
                gradient.addColorStop(1, 'rgba(0,0,0,0)')
                tplCtx.fillStyle = gradient
                tplCtx.fillRect(0, 0, 2 * radius, 2 * radius)
            }

            return tplCanvas
        }

        let _prepareData = function (data) {
            let renderData = []
            let min = data.min
            let max = data.max
            let radi = data.radi
            var data = data.data

            let xValues = Object.keys(data)
            let xValuesLen = xValues.length

            while (xValuesLen--) {
                let xValue = xValues[xValuesLen]
                let yValues = Object.keys(data[xValue])
                let yValuesLen = yValues.length
                while (yValuesLen--) {
                    let yValue = yValues[yValuesLen]
                    let value = data[xValue][yValue]
                    let radius = radi[xValue][yValue]
                    renderData.push({
                        x: xValue,
                        y: yValue,
                        value: value,
                        radius: radius,
                    })
                }
            }

            return {
                min: min,
                max: max,
                data: renderData,
            }
        }

        function Canvas2dRenderer(config) {
            let container = config.container
            let shadowCanvas = (this.shadowCanvas = document.createElement('canvas'))
            let canvas = (this.canvas = config.canvas || document.createElement('canvas'))
            let renderBoundaries = (this._renderBoundaries = [10000, 10000, 0, 0])

            let computed = getComputedStyle(config.container) || {}

            canvas.className = 'heatmap-canvas'

            this._width =
                canvas.width =
                shadowCanvas.width =
                    config.width || +computed.width.replace(/px/, '')
            this._height =
                canvas.height =
                shadowCanvas.height =
                    config.height || +computed.height.replace(/px/, '')

            this.shadowCtx = shadowCanvas.getContext('2d')
            this.ctx = canvas.getContext('2d')

            // @TODO:
            // conditional wrapper

            canvas.style.cssText = shadowCanvas.style.cssText = 'position:absolute;left:0;top:0;'

            container.style.position = 'relative'
            container.appendChild(canvas)

            this._palette = _getColorPalette(config)
            this._templates = {}

            this._setStyles(config)
        }

        Canvas2dRenderer.prototype = {
            renderPartial: function (data) {
                if (data.data.length > 0) {
                    this._drawAlpha(data)
                    this._colorize()
                }
            },
            renderAll: function (data) {
                // reset render boundaries
                this._clear()
                if (data.data.length > 0) {
                    this._drawAlpha(_prepareData(data))
                    this._colorize()
                }
            },
            _updateGradient: function (config) {
                this._palette = _getColorPalette(config)
            },
            updateConfig: function (config) {
                if (config['gradient']) {
                    this._updateGradient(config)
                }
                this._setStyles(config)
            },
            setDimensions: function (width, height) {
                this._width = width
                this._height = height
                this.canvas.width = this.shadowCanvas.width = width
                this.canvas.height = this.shadowCanvas.height = height
            },
            _clear: function () {
                this.shadowCtx.clearRect(0, 0, this._width, this._height)
                this.ctx.clearRect(0, 0, this._width, this._height)
            },
            _setStyles: function (config) {
                this._blur = config.blur == 0 ? 0 : config.blur || config.defaultBlur

                if (config.backgroundColor) {
                    this.canvas.style.backgroundColor = config.backgroundColor
                }

                this._width =
                    this.canvas.width =
                    this.shadowCanvas.width =
                        config.width || this._width
                this._height =
                    this.canvas.height =
                    this.shadowCanvas.height =
                        config.height || this._height

                this._opacity = (config.opacity || 0) * 255
                this._maxOpacity = (config.maxOpacity || config.defaultMaxOpacity) * 255
                this._minOpacity = (config.minOpacity || config.defaultMinOpacity) * 255
                this._useGradientOpacity = !!config.useGradientOpacity
            },
            _drawAlpha: function (data) {
                let min = (this._min = data.min)
                let max = (this._max = data.max)
                var data = data.data || []
                let dataLen = data.length
                // on a point basis?
                let blur = 1 - this._blur

                while (dataLen--) {
                    let point = data[dataLen]

                    let x = point.x
                    let y = point.y
                    let radius = point.radius
                    // if value is bigger than max
                    // use max as value
                    let value = Math.min(point.value, max)
                    let rectX = x - radius
                    let rectY = y - radius
                    let shadowCtx = this.shadowCtx

                    var tpl
                    if (!this._templates[radius]) {
                        this._templates[radius] = tpl = _getPointTemplate(radius, blur)
                    } else {
                        tpl = this._templates[radius]
                    }
                    // value from minimum / value range
                    // => [0, 1]
                    let templateAlpha = (value - min) / (max - min)
                    // this fixes #176: small values are not visible because globalAlpha < .01 cannot be read from imageData
                    shadowCtx.globalAlpha = templateAlpha < 0.01 ? 0.01 : templateAlpha

                    shadowCtx.drawImage(tpl, rectX, rectY)

                    // update renderBoundaries
                    if (rectX < this._renderBoundaries[0]) {
                        this._renderBoundaries[0] = rectX
                    }
                    if (rectY < this._renderBoundaries[1]) {
                        this._renderBoundaries[1] = rectY
                    }
                    if (rectX + 2 * radius > this._renderBoundaries[2]) {
                        this._renderBoundaries[2] = rectX + 2 * radius
                    }
                    if (rectY + 2 * radius > this._renderBoundaries[3]) {
                        this._renderBoundaries[3] = rectY + 2 * radius
                    }
                }
            },
            _colorize: function () {
                let x = this._renderBoundaries[0]
                let y = this._renderBoundaries[1]
                let width = this._renderBoundaries[2] - x
                let height = this._renderBoundaries[3] - y
                let maxWidth = this._width
                let maxHeight = this._height
                let opacity = this._opacity
                let maxOpacity = this._maxOpacity
                let minOpacity = this._minOpacity
                let useGradientOpacity = this._useGradientOpacity

                if (x < 0) {
                    x = 0
                }
                if (y < 0) {
                    y = 0
                }
                if (x + width > maxWidth) {
                    width = maxWidth - x
                }
                if (y + height > maxHeight) {
                    height = maxHeight - y
                }

                let img = this.shadowCtx.getImageData(x, y, width, height)
                let imgData = img.data
                let len = imgData.length
                let palette = this._palette

                for (let i = 3; i < len; i += 4) {
                    let alpha = imgData[i]
                    let offset = alpha * 4

                    if (!offset) {
                        continue
                    }

                    var finalAlpha
                    if (opacity > 0) {
                        finalAlpha = opacity
                    } else {
                        if (alpha < maxOpacity) {
                            if (alpha < minOpacity) {
                                finalAlpha = minOpacity
                            } else {
                                finalAlpha = alpha
                            }
                        } else {
                            finalAlpha = maxOpacity
                        }
                    }

                    imgData[i - 3] = palette[offset]
                    imgData[i - 2] = palette[offset + 1]
                    imgData[i - 1] = palette[offset + 2]
                    imgData[i] = useGradientOpacity ? palette[offset + 3] : finalAlpha
                }

                img.data = imgData
                this.ctx.putImageData(img, x, y)

                this._renderBoundaries = [1000, 1000, 0, 0]
            },
            getValueAt: function (point) {
                let value
                let shadowCtx = this.shadowCtx
                let img = shadowCtx.getImageData(point.x, point.y, 1, 1)
                let data = img.data[3]
                let max = this._max
                let min = this._min

                value = (Math.abs(max - min) * (data / 255)) >> 0

                return value
            },
            getDataURL: function () {
                return this.canvas.toDataURL()
            },
        }

        return Canvas2dRenderer
    })()

    let Renderer = (function RendererClosure() {
        let rendererFn = false

        if (HeatmapConfig['defaultRenderer'] === 'canvas2d') {
            rendererFn = Canvas2dRenderer
        }

        return rendererFn
    })()

    let Util = {
        merge: function () {
            let merged = {}
            let argsLen = arguments.length
            for (let i = 0; i < argsLen; i++) {
                let obj = arguments[i]
                for (let key in obj) {
                    merged[key] = obj[key]
                }
            }
            return merged
        },
    }
    // Heatmap Constructor
    let Heatmap = (function HeatmapClosure() {
        let Coordinator = (function CoordinatorClosure() {
            function Coordinator() {
                this.cStore = {}
            }

            Coordinator.prototype = {
                on: function (evtName, callback, scope) {
                    let cStore = this.cStore

                    if (!cStore[evtName]) {
                        cStore[evtName] = []
                    }
                    cStore[evtName].push(function (data) {
                        return callback.call(scope, data)
                    })
                },
                emit: function (evtName, data) {
                    let cStore = this.cStore
                    if (cStore[evtName]) {
                        let len = cStore[evtName].length
                        for (let i = 0; i < len; i++) {
                            let callback = cStore[evtName][i]
                            callback(data)
                        }
                    }
                },
            }

            return Coordinator
        })()

        let _connect = function (scope) {
            let renderer = scope._renderer
            let coordinator = scope._coordinator
            let store = scope._store

            coordinator.on('renderpartial', renderer.renderPartial, renderer)
            coordinator.on('renderall', renderer.renderAll, renderer)
            coordinator.on('extremachange', function (data) {
                scope._config.onExtremaChange &&
                    scope._config.onExtremaChange({
                        min: data.min,
                        max: data.max,
                        gradient: scope._config['gradient'] || scope._config['defaultGradient'],
                    })
            })
            store.setCoordinator(coordinator)
        }

        function Heatmap() {
            let config = (this._config = Util.merge(HeatmapConfig, arguments[0] || {}))
            this._coordinator = new Coordinator()
            if (config['plugin']) {
                let pluginToLoad = config['plugin']
                if (!HeatmapConfig.plugins[pluginToLoad]) {
                    throw new Error(
                        `Plugin '${pluginToLoad}' not found. Maybe it was not registered.`,
                    )
                } else {
                    let plugin = HeatmapConfig.plugins[pluginToLoad]
                    // set plugin renderer and store
                    this._renderer = new plugin.renderer(config)
                    this._store = new plugin.store(config)
                }
            } else {
                this._renderer = new Renderer(config)
                this._store = new Store(config)
            }
            _connect(this)
        }

        // @TODO:
        // add API documentation
        Heatmap.prototype = {
            addData: function () {
                this._store.addData.apply(this._store, arguments)
                return this
            },
            removeData: function () {
                this._store.removeData && this._store.removeData.apply(this._store, arguments)
                return this
            },
            setData: function () {
                this._store.setData.apply(this._store, arguments)
                return this
            },
            setDataMax: function () {
                this._store.setDataMax.apply(this._store, arguments)
                return this
            },
            setDataMin: function () {
                this._store.setDataMin.apply(this._store, arguments)
                return this
            },
            configure: function (config) {
                this._config = Util.merge(this._config, config)
                this._renderer.updateConfig(this._config)
                this._coordinator.emit('renderall', this._store._getInternalData())
                return this
            },
            repaint: function () {
                this._coordinator.emit('renderall', this._store._getInternalData())
                return this
            },
            getData: function () {
                return this._store.getData()
            },
            getDataURL: function () {
                return this._renderer.getDataURL()
            },
            getValueAt: function (point) {
                if (this._store.getValueAt) {
                    return this._store.getValueAt(point)
                } else if (this._renderer.getValueAt) {
                    return this._renderer.getValueAt(point)
                } else {
                    return null
                }
            },
        }

        return Heatmap
    })()

    // core
    let heatmapFactory = {
        create: function (config) {
            return new Heatmap(config)
        },
        register: function (pluginKey, plugin) {
            HeatmapConfig.plugins[pluginKey] = plugin
        },
    }

    return heatmapFactory
})
