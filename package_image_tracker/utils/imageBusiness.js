const promiseEx = require('../../utils/promiseEx.js')
const ImageTracker = require('ImageTracker.js')
const hiddenCanvasId = 'hiddenCanvas';
// pattern image resample levels
const resampleLevels = 4;
// pattern image url: relative url,temp url and network url.
const patternImageUrl = '../../../face_pattern.jpg';
// pattern image width
var patternFrameWidth;
// pattern image height
var patternFrameHeight;
// pattern image max width
const patternFrameMaxWidth = 375;
// image tracker.
var tracker = null;
// temp pattern Image Path
var tempPatternImagePath = null;
// pattern Image Array
var patternImageArray = [];
// magic number
const sc_inc = Math.sqrt(2.0);

function detect(frame, width, height, callback) {
    if (!tracker) {
        console.log('detect', 'waiting initing tracker.');
        return;
    }
    var result = tracker.track(frame, width, height);
    if (callback) {
        callback(result);
    }

}

async function drawPatternImageCallback() {
    var imageX = 0;
    var newWidth = patternFrameWidth;
    var newHeight = patternFrameHeight;

    for (var i = 0; i < resampleLevels; i++) {
        var canvasRes = await promiseEx(wx.canvasGetImageData, {
            canvasId: hiddenCanvasId,
            x: imageX,
            y: 0,
            width: newWidth,
            height: newHeight,
        });
        console.log('resample pattern image', canvasRes.width, canvasRes.height);
        patternImageArray.push({
            pixels: canvasRes.data,
            width: canvasRes.width,
            height: canvasRes.height,
        });

        // resample
        imageX += newWidth;
        newWidth = Math.round(newWidth / sc_inc);
        newHeight = Math.round(newHeight / sc_inc);
    }

    // init ImageTracker
    tracker = new ImageTracker(patternImageArray);

}

// get patter image
async function initTracker() {
    const ctx = wx.createCanvasContext(hiddenCanvasId);
    // init
    patternImageArray = [];

    var res = await promiseEx(wx.getImageInfo, {
        src: patternImageUrl,
    });
    // pattern image temp path
    tempPatternImagePath = res.path;
    // pattern image size
    patternFrameWidth = res.width;
    patternFrameHeight = res.height;

    // reduce image size to increase image process speed
    if (patternFrameWidth > patternFrameMaxWidth) {
        patternFrameWidth = patternFrameMaxWidth;
        patternFrameHeight = (res.height / res.width) * patternFrameMaxWidth;
    }
    // resample width and height
    var newWidth = patternFrameWidth;
    var newHeight = patternFrameHeight;
    var imageX = 0;

    for (var i = 0; i < resampleLevels; i++) {
        // draw image on canvas
        ctx.drawImage(tempPatternImagePath, imageX, 0, newWidth, newHeight);
        // resample
        imageX += newWidth;
        newWidth = Math.round(newWidth / sc_inc);
        newHeight = Math.round(newHeight / sc_inc);
    }

    ctx.draw(false, drawPatternImageCallback);
}

module.exports = {
    initTracker,
    detect,
};
