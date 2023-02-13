/*
 * LightningChartJS example for Chart with 2D spectrogram + dynamic projections on mouse interaction.
 */
// Import LightningChartJS
const lcjs = require('@arction/lcjs')

// Extract required parts from LightningChartJS.
const {
    lightningChart,
    PalettedFill,
    LUT,
    emptyFill,
    emptyLine,
    AxisScrollStrategies,
    LegendBoxBuilders,
    translatePoint,
    synchronizeAxisIntervals,
    regularColorSteps,
    Themes,
} = lcjs

const { createSpectrumDataGenerator } = require('@arction/xydata')

const spectrogramColumns = 1024
const spectrogramRows = 1024

// Create charts and series.

const dashboard = lightningChart()
    .Dashboard({
        // theme: Themes.darkGold,
        numberOfColumns: 2,
        numberOfRows: 2,
    })
    .setColumnWidth(0, 1)
    .setColumnWidth(1, 0.2)
    .setRowHeight(0, 1)
    .setRowHeight(1, 0.3)

const chartSpectrogram = dashboard
    .createChartXY({
        columnIndex: 0,
        rowIndex: 0,
    })
    .setTitle('2D Spectrogram with X & Y projection on mouse hover')

const theme = dashboard.getTheme()
const seriesSpectrogram = chartSpectrogram
    .addHeatmapGridSeries({
        columns: spectrogramColumns,
        rows: spectrogramRows,
    })
    .setMouseInteractions(false)
    .setWireframeStyle(emptyLine)
    .setFillStyle(
        new PalettedFill({
            lookUpProperty: 'value',
            lut: new LUT({
                interpolate: true,
                steps: regularColorSteps(0, 1, theme.examples.spectrogramColorPalette),
            }),
        }),
    )

const legend = chartSpectrogram
    .addLegendBox(LegendBoxBuilders.HorizontalLegendBox)
    // Dispose example UI elements automatically if they take too much space. This is to avoid bad UI on mobile / etc. devices.
    .setAutoDispose({
        type: 'max-width',
        maxWidth: 0.8,
    })
    .add(chartSpectrogram)

const chartProjectionY = dashboard
    .createChartXY({
        columnIndex: 1,
        rowIndex: 0,
    })
    .setTitleFillStyle(emptyFill)
    // NOTE: Hardcoded alignment with Spectrogram chart.
    .setPadding({ top: 44 })
    .setMouseInteractions(false)

chartProjectionY.getDefaultAxisY().setScrollStrategy(undefined).setMouseInteractions(false)

// Sync projection Axis with spectogram chart projected axis.
synchronizeAxisIntervals(chartSpectrogram.getDefaultAxisY(), chartProjectionY.getDefaultAxisY())

chartProjectionY
    .getDefaultAxisX()
    .setScrollStrategy(AxisScrollStrategies.expansion)
    .setInterval({ start: 0, end: 1, stopAxisAfter: false })
    .setMouseInteractions(false)

const seriesProjectionY = chartProjectionY
    .addLineSeries({
        dataPattern: {
            pattern: 'ProgressiveY',
            regularProgressiveStep: true,
        },
    })
    .setName('Projection (Y)')
    .setCursorSolveBasis('nearest-y')

const chartProjectionX = dashboard
    .createChartXY({
        columnIndex: 0,
        rowIndex: 1,
    })
    .setTitleFillStyle(emptyFill)
    .setMouseInteractions(false)
chartProjectionX.getDefaultAxisX().setScrollStrategy(undefined).setMouseInteractions(false)

// Sync projection Axis with spectogram chart projected axis.
synchronizeAxisIntervals(chartSpectrogram.getDefaultAxisX(), chartProjectionX.getDefaultAxisX())

chartProjectionX
    .getDefaultAxisY()
    .setScrollStrategy(AxisScrollStrategies.expansion)
    .setInterval({ start: 0, end: 1, stopAxisAfter: false })
    .setMouseInteractions(false)
const seriesProjectionX = chartProjectionX
    .addLineSeries({
        dataPattern: {
            pattern: 'ProgressiveX',
            regularProgressiveStep: true,
        },
    })
    .setName('Projection (X)')

// Align charts nicely.
chartSpectrogram.getDefaultAxisY().setThickness(50)
chartProjectionX.getDefaultAxisY().setThickness(50)
chartSpectrogram.getDefaultAxisX().setThickness(25)
chartProjectionY.getDefaultAxisX().setThickness(25)

// Generate data.
createSpectrumDataGenerator()
    .setNumberOfSamples(spectrogramColumns)
    .setSampleSize(spectrogramRows)
    .generate()
    .toPromise()
    .then((data) => {
        seriesSpectrogram.invalidateIntensityValues(data)

        const showProjection = (axisX, axisY) => {
            // Calculate spectrogram 1D projections at axis location for both X and Y planes.
            let projectionY
            try {
                projectionY = data[Math.round(axisX)].map((value, i) => ({
                    x: value,
                    y: i,
                }))
            } catch (e) {}

            let projectionX
            try {
                projectionX = []
                const row = Math.round(axisY)
                for (let x = 0; x < spectrogramColumns; x += 1) {
                    projectionX[x] = {
                        x,
                        y: data[x][row],
                    }
                }
            } catch (e) {}

            // Update projection series data.
            seriesProjectionY.clear()
            if (projectionY) {
                seriesProjectionY.add(projectionY)
            }

            seriesProjectionX.clear()
            if (projectionX) {
                seriesProjectionX.add(projectionX)
            }
        }

        // Add custom interaction when mouse is hovered over spectrogram chart.
        chartSpectrogram.onSeriesBackgroundMouseMove((_, event) => {
            // Solve mouse location on Axis.
            const locationAxis = translatePoint(
                chartSpectrogram.engine.clientLocation2Engine(event.clientX, event.clientY),
                chartSpectrogram.engine.scale,
                seriesSpectrogram.scale,
            )
            showProjection(locationAxis.x, locationAxis.y)
        })

        showProjection(spectrogramColumns / 2, spectrogramRows / 2)
    })
