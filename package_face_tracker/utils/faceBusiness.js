const tracking = require('../../utils/tracking.js')
const jsfeat = require('../../utils/jsfeat.js')
const faceData = require('faceData.js')
const landmarksData = require('Landmarks.js')
const regressorData = require('Regressor.js')
const canvasId = 'canvas1';
const hiddenCanvasId = 'hiddenCanvas';
// canvas width
var canvasWidth = 0;
// canvas height
var canvasHeight = 0;
// max canvas width
const maxCanvasWidth = 375;
// face tracker parameter
const initialScale = 4;
// face tracker parameter
const stepSize = 1;
// decoration image for image tracker 
const decorationImageUrl = '../../../cat_beard.png';
// face tracker
var tracker = null;
// temp photo path
var tempImagePath = null;
var showFaceRect = false;
var showFeaturePoint = false;

function drawImageOnUI(transformData,
    canvasWidth,
    canvasHeight,
    ctx) {
    const hiddenCtx = wx.createCanvasContext(hiddenCanvasId);
    // avoid to get hidden images existed
    const offsetLeft = canvasWidth;
    // The number 375 means picture "cat_beard.png" width and height.
    hiddenCtx.drawImage(decorationImageUrl, 0, 0, canvasWidth, canvasHeight);
    console.log('size of decoration image', canvasWidth, canvasHeight);
    hiddenCtx.draw(false, function () {
        // get image data of srcImage
        wx.canvasGetImageData({
            canvasId: hiddenCanvasId,
            x: 0,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
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
                        custom.invert_transform({ data: transformData });
                        // warp perspective
                        custom.warp_perspective_color(
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
                                    // When function "wx.canvasToTempFilePath" is called frequently on Android Wechat, WeChat will be crashed.
                                    // get image file path
                                    wx.canvasToTempFilePath({
                                        x: offsetLeft,
                                        y: 0,
                                        width: canvasWidth,
                                        height: canvasHeight,
                                        destWidth: canvasWidth,
                                        destHeight: canvasHeight,
                                        canvasId: hiddenCanvasId,
                                        success(res2) {
                                            // draw image
                                            ctx.drawImage(res2.tempFilePath, 0, 0, canvasWidth, canvasHeight);
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

function drawFaceDecoration(landmarks, ctx) {
    var srcPoints = [];
    var destPoints = [];
    // The number 375 means picture "cat_beard.png" width and height.
    console.log('drawFaceDecoration', canvasWidth, canvasHeight);
    var widthRatio = canvasWidth / 375;
    var heightRatio = canvasHeight / 375;
    // The following are 4 source points.
    // The numbers 108.7264383 and 109.1273706 are positions on picture "cat_beard.png".
    // The picture width is 375 and height is 375.
    srcPoints.push({
        x: 141.71 * widthRatio,
        y: 139.53 * heightRatio,
    });
    srcPoints.push({
        x: 216.84 * widthRatio,
        y: 137.23 * heightRatio,
    });
    srcPoints.push({
        x: 156.46 * widthRatio,
        y: 224.42 * heightRatio,
    });
    srcPoints.push({
        x: 221.86 * widthRatio,
        y: 222.46 * heightRatio,
    });
    // The following are 4 destion points.
    // The point index 20, 24, 27 and 29 are index of feature points on the face.
    destPoints.push({
        x: landmarks[20][0],
        y: landmarks[20][1],
    });
    destPoints.push({
        x: landmarks[24][0],
        y: landmarks[24][1],
    });
    destPoints.push({
        x: landmarks[27][0],
        y: landmarks[27][1],
    });
    destPoints.push({
        x: landmarks[29][0],
        y: landmarks[29][1],
    });
    // get transform from source to destion
    var transformData = custom.perspective_transform(
        srcPoints[0].x, srcPoints[0].y, destPoints[0].x, destPoints[0].y,
        srcPoints[1].x, srcPoints[1].y, destPoints[1].x, destPoints[1].y,
        srcPoints[2].x, srcPoints[2].y, destPoints[2].x, destPoints[2].y,
        srcPoints[3].x, srcPoints[3].y, destPoints[3].x, destPoints[3].y,
    );
    //draw image on UI
    drawImageOnUI(transformData.data,
        canvasWidth,
        canvasHeight, ctx);
}

function initTracker() {
    const ctx = wx.createCanvasContext(canvasId);
    tracking.ViolaJones.classifiers.face = faceData;
    tracking.LBF.LandmarksData = landmarksData;
    tracking.LBF.RegressorData = regressorData;
    // maxNumStages depends on children of "Regressor.js"
    tracking.LBF.maxNumStages = 1;
    // new LandmarksTracker
    tracker = new tracking.LandmarksTracker();
    tracker.setInitialScale(initialScale);
    tracker.setStepSize(stepSize);
    tracker.setEdgesDensity(0.1);
    tracker.on('track', function (event) {
        if (!event.data) {
            return;
        }
        console.log('track data', event.data);
        if (tempImagePath) {
            if (event.data.faces.length === 0) {
                var message = 'No results found.';
                console.log(message);
                wx.showToast({
                    title: message,
                    icon: 'none'
                });
            }
            // draw origin photo on canvas
            ctx.drawImage(tempImagePath, 0, 0, canvasWidth, canvasHeight);
        }

        if (showFaceRect) {
            // draw rect
            event.data.faces.forEach(function (rect) {
                // scale
                rect.x = Math.round(rect.x);
                rect.y = Math.round(rect.y);
                rect.width = Math.round(rect.width);
                rect.height = Math.round(rect.height);
                // draw
                ctx.strokeStyle = '#a64ceb';
                ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
                //ctx.font = '11px sans-serif';
                ctx.fillStyle = "#fff";
                ctx.fillText('x: ' + rect.x, rect.x + rect.width + 5, rect.y + 11);
                ctx.fillText('y: ' + rect.y, rect.x + rect.height + 5, rect.y + 22);
            });
        }

        if (showFeaturePoint) {
            // draw points
            event.data.landmarks.forEach(function (landmarks) {
                for (var i = 0; i < landmarks.length; i++) {
                    var landmark = landmarks[i];
                    var x = landmark[0];
                    var y = landmark[1];
                    // scale
                    x = Math.round(x);
                    y = Math.round(y);
                    // draw
                    ctx.beginPath();
                    ctx.fillStyle = "#fff";
                    ctx.arc(x, y, 1, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.fillText(i, x + 3, y + 3);
                }
            });
        }

        if (event.data.landmarks.length > 0) {
            // draw face decoration
            drawFaceDecoration(event.data.landmarks[0], ctx);
        }
        // function drawImageOnUI() will invoke function draw().
        //ctx.draw();
    });
}

function startTrack(imageData,
    _canvasWidth,
    _canvasHeight,
    photoPath,
    _showFaceRect,
    _showFeaturePoint) {
    // set canvas width and Height
    canvasWidth = _canvasWidth;
    canvasHeight = _canvasHeight;
    // save origin image path
    tempImagePath = photoPath;
    showFaceRect = _showFaceRect;
    showFeaturePoint = _showFeaturePoint;
    // start
    var startDate = new Date();
    // process image
    tracker.track(imageData, canvasWidth, canvasHeight);
    // end
    var endDate = new Date();
    console.log('cost time:', endDate - startDate, 'ms');
}

var custom = {};

custom.perspective_transform = function (
    src_x0, src_y0, dst_x0, dst_y0,
    src_x1, src_y1, dst_x1, dst_y1,
    src_x2, src_y2, dst_x2, dst_y2,
    src_x3, src_y3, dst_x3, dst_y3) {
    var transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
    jsfeat.math.perspective_4point_transform(transform,
        src_x0, src_y0, dst_x0, dst_y0,
        src_x1, src_y1, dst_x1, dst_y1,
        src_x2, src_y2, dst_x2, dst_y2,
        src_x3, src_y3, dst_x3, dst_y3);
    return transform;
};

custom.invert_transform = function (transform) {
    jsfeat.matmath.invert_3x3(transform, transform);
};

/*
Reference: https://github.com/josundin/magcut/blob/master/js/imagewarp.js
Author: josundin
Title: image warp
License: MIT
*/
custom.warp_perspective_color = function (src, dst, transform) {
    var dst_width = dst.width | 0, dst_height = dst.height | 0;
    var src_width = src.width | 0, src_height = src.height | 0;
    var x = 0, y = 0, off = 0, ixs = 0, iys = 0, xs = 0.0, ys = 0.0, xs0 = 0.0, ys0 = 0.0, ws = 0.0, sc = 0.0, a = 0.0, b = 0.0, p0r = 0.0, p1r = 0.0, p0g = 0.0, p1g = 0.0, p0b = 0.0, p1b = 0.0;
    var td = transform;
    var m00 = td[0], m01 = td[1], m02 = td[2],
        m10 = td[3], m11 = td[4], m12 = td[5],
        m20 = td[6], m21 = td[7], m22 = td[8];
    var dptr = 0;

    for (var i = 0; i < dst_height; ++i) {
        xs0 = m01 * i + m02,
            ys0 = m11 * i + m12,
            ws = m21 * i + m22;
        for (var j = 0; j < dst_width; j++ , dptr += 4, xs0 += m00, ys0 += m10, ws += m20) {
            sc = 1.0 / ws;
            xs = xs0 * sc, ys = ys0 * sc;
            ixs = xs | 0, iys = ys | 0;

            if (xs > 0 && ys > 0 && ixs < (src_width - 1) && iys < (src_height - 1)) {

                a = Math.max(xs - ixs, 0.0);
                b = Math.max(ys - iys, 0.0);
                //off = (src_width*iys + ixs)|0;
                off = (((src.width * 4) * iys) + (ixs * 4)) | 0;

                p0r = src.data[off] + a * (src.data[off + 4] - src.data[off]);
                p1r = src.data[off + (src_width * 4)] + a * (src.data[off + (src_width * 4) + 4] - src.data[off + (src_width * 4)]);

                p0g = src.data[off + 1] + a * (src.data[off + 4 + 1] - src.data[off + 1]);
                p1g = src.data[off + (src_width * 4) + 1] + a * (src.data[off + (src_width * 4) + 4 + 1] - src.data[off + (src_width * 4) + 1]);

                p0b = src.data[off + 2] + a * (src.data[off + 4 + 2] - src.data[off + 2]);
                p1b = src.data[off + (src_width * 4) + 2] + a * (src.data[off + (src_width * 4) + 4 + 2] - src.data[off + (src_width * 4) + 2]);

                dst.data[dptr + 0] = p0r + b * (p1r - p0r);
                dst.data[dptr + 1] = p0g + b * (p1g - p0g);
                dst.data[dptr + 2] = p0b + b * (p1b - p0b);

                dst.data[((i * (dst.width * 4)) + (j * 4)) + 3] = 255;
            }
            else {
                dst.data[((i * (dst.width * 4)) + (j * 4)) + 3] = 0;
            }
        }
    }
};

module.exports = {
    startTrack,
    initTracker,
    canvasId,
    hiddenCanvasId,
    maxCanvasWidth,
};

