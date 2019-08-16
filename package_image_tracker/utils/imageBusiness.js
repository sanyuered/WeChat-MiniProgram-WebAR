const tracking = require('../../utils/tracking.js')
const ImageTracker = require('ImageTracker.js')
const canvasId = 'canvas1';
const hiddenCanvasId = 'hiddenCanvas';
// canvas width
var canvasWidth = 0;
// canvas height
var canvasHeight = 0;
// max canvas width
const maxCanvasWidth = 375;
// pattern image resample levels
const resampleLevels = 4;
// pattern image url: relative url,temp url and network url.
const patternImageUrl = '../../../face.jpg';
// pattern image width
var patternFrameWidth = 0;
// pattern image height
var patternFrameHeight = 0;
// pattern image max width
const patternFrameMaxWidth = 375;
// decoration image for image tracker 
const decorationImageUrl = '../../../cat_beard.png';
// image tracker.
var tracker = null;
// temp pattern Image Path
var tempPatternImagePath = null;
// pattern Image Array
var patternImageArray = [];
// temp photo path
var tempImagePath = null;

function drawImageOnUI(transformData,
    patternWidth,
    patternHeight,
    ctx) {
    const hiddenCtx = wx.createCanvasContext(hiddenCanvasId);
    // avoid to get hidden images existed
    const offsetLeft = canvasWidth;
    hiddenCtx.drawImage(decorationImageUrl, 0, 0, patternWidth, patternHeight);
    console.log('size of decoration image', patternWidth, patternHeight);
    hiddenCtx.draw(false, function () {
        // get image data of srcImage
        wx.canvasGetImageData({
            canvasId: hiddenCanvasId,
            x: 0,
            y: 0,
            width: patternWidth,
            height: patternHeight,
            success(srcImage) {
                // create a image data of destImage
                wx.canvasGetImageData({
                    canvasId: hiddenCanvasId,
                    x: offsetLeft,
                    y: 0,
                    width: canvasWidth,
                    height: canvasHeight,
                    success(destImage) {
                        // invert the transform for function "warp_perspective_color" 
                        ImageTracker.invert_transform({ data: transformData });
                        // warp perspective
                        ImageTracker.warp_perspective_color(
                            srcImage,
                            destImage,
                            transformData);
                        var itemData = destImage.data;
                        // convert from black to transparent.
                        for (var i = 0; i < itemData.length; i = i + 4) {
                            if (itemData[i] === 0 &&
                                itemData[i + 1] === 0 &&
                                itemData[i + 2] === 0 &&
                                itemData[i + 3] !== 0) {
                                itemData[i + 3] = 0;
                            }
                        }
                        // "take a photo" mode
                        if (tempImagePath) {
                            // put image data
                            wx.canvasPutImageData({
                                canvasId: hiddenCanvasId,
                                x: offsetLeft,
                                y: 0,
                                width: canvasWidth,
                                height: canvasHeight,
                                data: itemData,
                                success(res) {
                                    // get image file path
                                    wx.canvasToTempFilePath({
                                        x: offsetLeft,
                                        y: 0,
                                        width: canvasWidth,
                                        height: canvasHeight,
                                        destWidth: canvasWidth,
                                        destHeight: canvasHeight,
                                        canvasId: hiddenCanvasId,
                                        success(res) {
                                            // draw image
                                            ctx.drawImage(res.tempFilePath, 0, 0, canvasWidth, canvasHeight);
                                            ctx.draw();
                                            console.log('drawImageOnUI', 'completed');
                                        }
                                    });
                                },
                                fail(errorMsg) {
                                    console.log('drawImageOnUI', errorMsg);
                                }
                            });
                        } else {
                            // put image data
                            wx.canvasPutImageData({
                                canvasId: canvasId,
                                x: 0,
                                y: 0,
                                width: canvasWidth,
                                height: canvasHeight,
                                data: itemData,
                                success(res) {
                                    console.log('drawImageOnUI', 'completed');
                                },
                                fail(errorMsg) {
                                    console.log('drawImageOnUI', errorMsg);
                                }
                            });
                        }

                    }
                });
            },
            fail(errorMsg) {
                console.log('canvasGetImageData', errorMsg);
            },
        });
    });
}

function getPatternImage(patternImageUrl, callback) {
    // magic number
    const sc_inc = Math.sqrt(2.0);
    const ctx = wx.createCanvasContext(hiddenCanvasId);
    // init
    patternImageArray = [];

    wx.getImageInfo({
        src: patternImageUrl,
        success: function (res) {
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
            ctx.draw(false, function () {
                imageX = 0;
                newWidth = patternFrameWidth;
                newHeight = patternFrameHeight;
                for (var i = 0; i < resampleLevels; i++) {
                    wx.canvasGetImageData({
                        canvasId: hiddenCanvasId,
                        x: imageX,
                        y: 0,
                        width: newWidth,
                        height: newHeight,
                        success(canvasRes) {
                            console.log('resample pattern image', canvasRes.width, canvasRes.height);
                            patternImageArray.push({
                                pixels: canvasRes.data,
                                width: canvasRes.width,
                                height: canvasRes.height,
                            });
                            if (patternImageArray.length === resampleLevels) {
                                if (typeof callback === 'function') {
                                    callback(patternImageArray);
                                }
                            }
                        }
                    });
                    // resample
                    imageX += newWidth;
                    newWidth = Math.round(newWidth / sc_inc);
                    newHeight = Math.round(newHeight / sc_inc);
                }
            });
        },
        fail: function (error) {
            console.log('getPatternImage', error);
        }
    });
}

function initTracker() {
    const ctx = wx.createCanvasContext(canvasId);
    // get patter image
    getPatternImage(patternImageUrl, function (patternImageArray) {
        tracker = new ImageTracker(patternImageArray);
        tracker.on('track', function (event) {
            if (!event.data) {
                return;
            }
            console.log('event.data', event.data);
            if (event.data.goodMatch < 10) {
                var message = 'No results found.';
                console.log(message);
                if (tempImagePath) {
                    wx.showToast({
                        title: message,
                        icon: 'none'
                    });
                }
                return;
            }
            if (tempImagePath) {
                // draw origin photo on canvas
                ctx.drawImage(tempImagePath, 0, 0, canvasWidth, canvasHeight);
            }

            if (event.data) {
                drawImageOnUI(event.data.transform.data,
                    event.data.width,
                    event.data.height,
                    ctx);
            }
            // function drawImageOnUI() will invoke function draw().
            //ctx.draw();
        });
    });
}

function startTrack(imageData,
    _canvasWidth,
    _canvasHeight,
    photoPath) {

    // set canvas width and Height
    canvasWidth = _canvasWidth;
    canvasHeight = _canvasHeight;
    // save origin image path
    tempImagePath = photoPath;
    // start
    var startDate = new Date();
    // process image
    tracker.track(imageData, canvasWidth, canvasHeight);
    // end
    var endDate = new Date();
    console.log('cost time:', endDate - startDate, 'ms');
}

module.exports = {
    startTrack,
    initTracker,
    canvasId,
    hiddenCanvasId,
    maxCanvasWidth,
};
