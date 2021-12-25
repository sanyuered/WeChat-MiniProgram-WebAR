const tracking = require('../../utils/tracking.js');
const MinDimension = 5;
// image tracker.
var tracker = null;
// canvas size
var canvasWidth;
var canvasHeight;
// it is camera image size, not camera style size.
var frameWidth;
var frameHeight;
// start
var start = null;

function initTracker(canvasMaskContext,
    customColor,
    colorRange,
    colorArray) {
    // rect.color = 'customGreen'
    tracking.ColorTracker.registerColor('customColor', function (r, g, b) {
        // customColor: R=120,G=250,B=180
        var dx = r - customColor.r;
        var dy = g - customColor.g;
        var dz = b - customColor.b;

        return dx * dx + dy * dy + dz * dz < colorRange;
    });

    // tracker = new tracking.ColorTracker(['magenta', 'cyan', 'yellow', 'customGreen']);
    tracker = new tracking.ColorTracker(colorArray);
    // Default Value:20
    tracker.setMinDimension(MinDimension);
    tracker.on('track', function (event) {
        // end
        var end = new Date() - start;
        console.log('detect', end, 'ms');

        var rects = event.data;
        updateMaskPosition(rects,
            canvasMaskContext,
            customColor);
    });
}

function detect(frame,
    _frameWidth,
    _frameHeight,
    _canvasWidth,
    _canvasHeight) {
    if (!tracker) {
        console.log('detect:', 'waiting for the tracker initing to complete.');
        return;
    }

    canvasWidth = _canvasWidth;
    canvasHeight = _canvasHeight;
    frameWidth = _frameWidth;
    frameHeight = _frameHeight;

    // start
    start = new Date();
    tracker.track(frame, frameWidth, frameHeight);
}

function updateMaskPosition(rects,
    canvasMaskContext,
    customColor) {
    console.log('updateMaskPosition', rects)
    const ctx = canvasMaskContext;

    var widthRatio = canvasWidth / frameWidth;
    var heightRatio = widthRatio;

    // clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    rects.forEach(function (rect) {
        // scale from 288x384 to 375x500
        rect.x = Math.round(rect.x * widthRatio);
        rect.y = Math.round(rect.y * heightRatio);
        rect.width = Math.round(rect.width * widthRatio);
        rect.height = Math.round(rect.height * heightRatio);

        if (rect.color === 'customColor') {
            rect.color = "rgb(" + customColor.r +
                "," + customColor.g +
                "," + customColor.b +
                ")";
        }

        /*
        // stroke
        ctx.strokeStyle = rect.color;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        */

        // fill
        ctx.fillStyle = rect.color;
        ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

        /*
        // text
        ctx.font = '11px';
        ctx.fillStyle = "#000";
        // context.fillText(text,x,y);
        ctx.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
        ctx.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);
        */
    });
}

module.exports = {
    initTracker,
    detect,
    updateMaskPosition,
};
