/*
 * LightningChartJS example for Chart with 2D spectrogram + dynamic projections on mouse interaction.
 */
// Import LightningChartJS
const lcjs = require("@arction/lcjs");

// Extract required parts from LightningChartJS.
const {
  lightningChart,
  PalettedFill,
  LUT,
  emptyFill,
  emptyLine,
  AxisScrollStrategies,
  LegendBoxBuilders,
  ColorHSV,
  translatePoint,
  Themes,
} = lcjs;

const { createSpectrumDataGenerator } = require("@arction/xydata");

const spectrogramColumns = 1024;
const spectrogramRows = 1024;

// Create charts and series.

const dashboard = lightningChart()
  .Dashboard({
    // theme: Themes.darkGold,
    numberOfColumns: 2,
    numberOfRows: 2,
    disableAnimations: true,
  })
  .setColumnWidth(0, 1)
  .setColumnWidth(1, 0.2)
  .setRowHeight(0, 1)
  .setRowHeight(1, 0.3);

const chartSpectrogram = dashboard
  .createChartXY({
    columnIndex: 0,
    rowIndex: 0,
  })
  .setTitle("2D Spectrogram with X & Y projection on mouse hover");

const seriesSpectrogram = chartSpectrogram
  .addHeatmapGridSeries({
    columns: spectrogramColumns,
    rows: spectrogramRows,
  })
  .setMouseInteractions(false)
  .setWireframeStyle(emptyLine)
  .setFillStyle(
    new PalettedFill({
      lookUpProperty: "value",
      lut: new LUT({
        interpolate: true,
        steps: [
          { value: 0, label: "0.0", color: ColorHSV(0, 1, 0) },
          { value: 0.2, label: "0.2", color: ColorHSV(270, 0.84, 0.2) },
          { value: 0.4, label: "0.4", color: ColorHSV(289, 0.86, 0.35) },
          { value: 0.6, label: "0.6", color: ColorHSV(324, 0.97, 0.56) },
          { value: 0.8, label: "0.8", color: ColorHSV(1, 1, 1) },
          { value: 1.0, label: "1.0", color: ColorHSV(44, 0.64, 1) },
        ],
      }),
    })
  );

const legend = chartSpectrogram
  .addLegendBox(LegendBoxBuilders.HorizontalLegendBox)
  // Dispose example UI elements automatically if they take too much space. This is to avoid bad UI on mobile / etc. devices.
  .setAutoDispose({
      type: 'max-width',
      maxWidth: 0.80,
  })
  .add(chartSpectrogram);

const chartProjectionY = dashboard
  .createChartXY({
    columnIndex: 1,
    rowIndex: 0,
  })
  .setTitleFillStyle(emptyFill)
  // NOTE: Hardcoded alignment with Spectrogram chart.
  .setPadding({ top: 44 })
  .setMouseInteractions(false);

chartProjectionY
  .getDefaultAxisY()
  .setScrollStrategy(undefined)
  .setMouseInteractions(false);
// Sync projection Axis with spectogram chart projected axis.
chartSpectrogram
  .getDefaultAxisY()
  .onScaleChange((start, end) =>
    chartProjectionY.getDefaultAxisY().setInterval(start, end, false, true)
  );
chartProjectionY
  .getDefaultAxisX()
  .setScrollStrategy(AxisScrollStrategies.expansion)
  .setInterval(0, 1)
  .setMouseInteractions(false);

const seriesProjectionY = chartProjectionY
  .addLineSeries({
    dataPattern: {
      pattern: "ProgressiveY",
      regularProgressiveStep: true,
    },
  })
  .setName("Projection (Y)")
  .setCursorSolveBasis("nearest-y");

const chartProjectionX = dashboard
  .createChartXY({
    columnIndex: 0,
    rowIndex: 1,
  })
  .setTitleFillStyle(emptyFill)
  .setMouseInteractions(false);
chartProjectionX
  .getDefaultAxisX()
  .setScrollStrategy(undefined)
  .setMouseInteractions(false);
// Sync projection Axis with spectogram chart projected axis.
chartSpectrogram
  .getDefaultAxisX()
  .onScaleChange((start, end) =>
    chartProjectionX.getDefaultAxisX().setInterval(start, end, false, true)
  );
chartProjectionX
  .getDefaultAxisY()
  .setScrollStrategy(AxisScrollStrategies.expansion)
  .setInterval(0, 1)
  .setMouseInteractions(false);
const seriesProjectionX = chartProjectionX
  .addLineSeries({
    dataPattern: {
      pattern: "ProgressiveX",
      regularProgressiveStep: true,
    },
  })
  .setName("Projection (X)");

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
    seriesSpectrogram.invalidateIntensityValues(data);

    console.log(seriesSpectrogram);
    // Add custom interaction when mouse is hovered over spectrogram chart.
    chartSpectrogram.onSeriesBackgroundMouseMove((_, event) => {
      // Solve mouse location on Axis.
      const locationAxis = translatePoint(
        chartSpectrogram.engine.clientLocation2Engine(
          event.clientX,
          event.clientY
        ),
        chartSpectrogram.engine.scale,
        seriesSpectrogram.scale
      );

      // Calculate spectrogram 1D projections at axis location for both X and Y planes.
      let projectionY;
      try {
        projectionY = data[Math.round(locationAxis.x)].map((value, i) => ({
          x: value,
          y: i,
        }));
      } catch (e) {}

      let projectionX;
      try {
        projectionX = [];
        const row = Math.round(locationAxis.y);
        for (let x = 0; x < spectrogramColumns; x += 1) {
          projectionX[x] = {
            x,
            y: data[x][row],
          };
        }
      } catch (e) {}

      // Update projection series data.
      seriesProjectionY.clear();
      if (projectionY) {
        seriesProjectionY.add(projectionY);
      }

      seriesProjectionX.clear();
      if (projectionX) {
        seriesProjectionX.add(projectionX);
      }
    });
  });
