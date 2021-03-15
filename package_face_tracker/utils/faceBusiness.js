const tracking = require('../../utils/tracking.js')
const faceData = require('faceData.js')
const landmarksData = require('Landmarks.js')
const regressorData = require('Regressor.js')
// face tracker parameter
const initialScale = 3;
// face tracker parameter
const stepSize = 1;
const showLandmark = true;
const canvasId = 'canvas2d';
// face tracker
var tracker = null;

function detect(frame, width, height, callback) {
    if (!tracker) {
        console.log('detect', 'waiting initing tracker.');
        return;
    }
    // start
    var startTime = new Date();
    var trackResult = tracker.track(frame, width, height);
    console.log('detect time:', new Date() - startTime, 'ms');
    // end
    var landmarksResult = trackResult.data.landmarks;
    var result = {
        prediction: null,
    }

    // not found a face
    if (landmarksResult.length === 0) {
        if (callback) {
            callback(result);
        }
        return;
    }

    // landmarks of a face
    var landmarks = landmarksResult[0].map(
        function (item) {
            return {
                x: item[0],
                y: item[1],
            };
        });
  
    result.prediction = landmarks;

    if (callback) {
        callback(result);
    }

    // if show landmark
    if (showLandmark) {
        drawLandmark(landmarks);
    }
}

function drawLandmark(landmarks) {
    const ctx = wx.createCanvasContext(canvasId);
    // draw points
    for (var i = 0; i < landmarks.length; i++) {
        var p = landmarks[i];
        // draw
        ctx.beginPath();
        ctx.fillStyle = "#fff";
        ctx.arc(p.x, p.y, 1, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillText(i, p.x + 3, p.y + 3);
    }

    ctx.draw(true);
}

function initTracker() {
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
}

module.exports = {
    detect,
    initTracker,
};

