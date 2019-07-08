
const tracking = require('../../utils/tracking.js')
const face = require('../../utils/face.js')
const landmarks = require('../../utils/Landmarks.js')
const regressor = require('../../utils/Regressor.js')
const canvasId = 'canvas1';
// canvas size
const canvasWidth = 375;
const canvasHeight = 458;
// frame size
const frameWidth = 288;
const frameHeight = 352;
// time interval
const intervalTime = 30;

Page({
  data: {
    tracker: null,
    listener: null,
    intervalId: null,
    devicePosition: 'back',
  },
  onLoad: function (option) {
    this.initTracking(option.type);
  },
  onUnload: function () {
    this.stopTacking();
  },
  drawByColor() {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
    _that.tracker = new tracking.ColorTracker(['yellow', 'magenta', 'cyan']);
    _that.tracker.on('track', function (event) {
      if (event.data.length != 0) {
        console.log(event);
      }
      // size ratio 
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;
      // draw tracking points
      event.data.forEach(function (rect) {
        // scale from 480x600 to 357x500
        rect.x = Math.round(rect.x * widthRatio);
        rect.y = Math.round(rect.y * heightRatio);
        rect.width = Math.round(rect.width * widthRatio);
        rect.height = Math.round(rect.height * heightRatio);
        // custom Color
        if (rect.color === 'custom') {
          rect.color = _that.tracker.customColor;
        }
        // draw rect
        ctx.strokeStyle = rect.color;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        // ctx.font = '11px sans-serif';
        ctx.fillText('x:' + rect.x, rect.x + rect.width + 5, rect.y + 11);
        ctx.fillText('y:' + rect.y, rect.x + rect.width + 5, rect.y + 22);
      });
      ctx.draw();
    });
    // start
    _that.startTacking();
  },
  drawByFace() {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
    tracking.ViolaJones.classifiers.face = face;
    tracking.LBF.LandmarksData = landmarks;
    tracking.LBF.RegressorData = regressor;
    // maxNumStages depends on children of "Regressor.js"
    tracking.LBF.maxNumStages = 1;

    // new LandmarksTracker
    _that.tracker = new tracking.LandmarksTracker();
    _that.tracker.setInitialScale(4);
    _that.tracker.setStepSize(2);
    _that.tracker.setEdgesDensity(0.1);
    _that.tracker.on('track', function (event) {
      if (!event.data) {
        return;
      }
      console.log(event.data);
      // size ratio 
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;
      // draw rect
      if (event.data.faces) {
        event.data.faces.forEach(function (rect) {
          // scale from 480x600 to 357x500
          rect.x = Math.round(rect.x * widthRatio);
          rect.y = Math.round(rect.y * heightRatio);
          rect.width = Math.round(rect.width * widthRatio);
          rect.height = Math.round(rect.height * heightRatio);
          // draw
          ctx.strokeStyle = '#a64ceb';
          ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
          //ctx.font = '11px sans-serif';
          ctx.fillStyle = "#fff";
          ctx.fillText('x:' + rect.x, rect.x + rect.width + 5, rect.y + 11);
          ctx.fillText('y:' + rect.y, rect.x + rect.width + 5, rect.y + 22);
        });
      }

      // draw points
      if (event.data.landmarks) {
        event.data.landmarks.forEach(function (landmarks) {
          for (var landmark in landmarks) {
            var x = landmarks[landmark][0];
            var y = landmarks[landmark][1];
            // scale from 480x600 to 357x500
            x = Math.round(x * widthRatio);
            y = Math.round(y * heightRatio);
            // draw
            ctx.beginPath();
            ctx.fillStyle = "#fff";
            ctx.arc(x,y, 1, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      }

      ctx.draw();
    });
    // start
    _that.startTacking();
  },
  stopTacking() {
    clearInterval(this.data.intervalId);
    if (this.data.listener) {
      this.data.listener.stop();
    }
  },
  startTacking() {
    var _that = this;
    var frameData = null;
    var frameWidth = 0;
    var frameHeight = 0;
    const context = wx.createCameraContext();

    if (!context.onCameraFrame) {
      var message = 'Does not support the new api "Camera.onCameraFrame".';
      console.log(message);
      wx.showToast({
        title: message,
        icon: 'none'
      });
      return;
    }

    // real-time
    const listener = context.onCameraFrame(function (frame) {
      console.log('frame:', frame.width, frame.height);
      frameData = new Uint8ClampedArray(frame.data);
      frameWidth = frame.width;
      frameHeight = frame.height;
    });
    // start
    listener.start();
    // process
    const intervalId = setInterval(function () {
      console.log('tracking');
      if (frameData) {
        _that.tracker.track(frameData,
          frameWidth,
          frameHeight);
      }
    }, intervalTime);

    _that.setData({
      listener: listener,
      intervalId: intervalId,
    });
  },
  initTracking(type) {
    if (type === 'color') {
      this.drawByColor();
    }
    else if (type === 'face') {
      this.drawByFace();
    }
  },
  changeDirection() {
    var status = this.data.devicePosition;

    if (status === 'back') {
      status = 'front';
    } else {
      status = 'back';
    }
    this.setData({
      devicePosition: status,
    });
  },
  error(e) {
    console.log(e.detail);
  }
})
