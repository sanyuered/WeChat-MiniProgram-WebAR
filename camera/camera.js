
const tracking = require('../../utils/tracking.js')
const face = require('../../utils/face.js')
const landmarks = require('../../utils/Landmarks.js')
const regressor = require('../../utils/Regressor.js')
const canvasId = 'canvas1';
const hiddenCanvasId = 'hiddenCanvas';
// canvas size
const canvasWidth = 375;
const canvasHeight = 458;
// small frame size
const frameWidth = 150;
// face tracker parameter
const initialScale = 2;
// color tracker parameter
const minDimension = 4;
// time interval should be greater than cost time
const intervalTime = 350;

Page({
  data: {
    tracker: null,
    listener: null,
    intervalId: null,
    devicePosition: 'back',
    // height of frame size
    frameHeight: 0,
    canvasContext:null,
    hiddenCanvasContext:null,
  },
  onLoad: function (option) {
    this.setData({
      canvasContext: wx.createCanvasContext(canvasId),
      hiddenCanvasContext:wx.createCanvasContext(hiddenCanvasId),
    });
    this.initTracking(option.type);
  },
  onUnload: function () {
    this.stopTacking();
  },
  drawByColor() {
    var _that = this;
    //const ctx = wx.createCanvasContext(canvasId);
    const ctx = _that.data.canvasContext;
    _that.tracker = new tracking.ColorTracker(['yellow', 'magenta', 'cyan']);
    _that.tracker.setMinDimension(minDimension);
    _that.tracker.on('track', function (event) {
      if (event.data.length != 0) {
        console.log(event);
      }
      // size ratio 
      var frameHeight = _that.data.frameHeight;
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;
      // draw tracking points
      event.data.forEach(function (rect) {
        // scale
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
    //const ctx = wx.createCanvasContext(canvasId);
    const ctx = _that.data.canvasContext;
    tracking.ViolaJones.classifiers.face = face;
    tracking.LBF.LandmarksData = landmarks;
    tracking.LBF.RegressorData = regressor;
    // maxNumStages depends on children of "Regressor.js"
    tracking.LBF.maxNumStages = 1;

    // new LandmarksTracker
    _that.tracker = new tracking.LandmarksTracker();
    _that.tracker.setInitialScale(initialScale);
    _that.tracker.setStepSize(2);
    _that.tracker.setEdgesDensity(0.1);
    _that.tracker.on('track', function (event) {
      if (!event.data) {
        return;
      }
      console.log(event.data);
      // size ratio 
      var frameHeight = _that.data.frameHeight;
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;
      // draw rect
      if (event.data.faces) {
        event.data.faces.forEach(function (rect) {
          // scale
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
            // scale
            x = Math.round(x * widthRatio);
            y = Math.round(y * heightRatio);
            // draw
            ctx.beginPath();
            ctx.fillStyle = "#fff";
            ctx.arc(x, y, 1, 0, 2 * Math.PI);
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
  compressPhoto(resData,
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    callback) {
    var _that = this;
    // image position
    const imageX = 0;
    const imageY = 0;
    //const ctx = wx.createCanvasContext(hiddenCanvasId);
    const ctx = _that.data.hiddenCanvasContext;
    wx.canvasPutImageData({
      canvasId: hiddenCanvasId,
      x: imageX,
      y: imageY,
      width: imageWidth,
      height: imageHeight,
      data: resData,
      success(res) {
        wx.canvasToTempFilePath({
          x: imageX,
          y: imageY,
          width: imageWidth,
          height: imageHeight,
          destWidth: frameWidth,
          destHeight: frameHeight,
          canvasId: hiddenCanvasId,
          success(res) {
            if (typeof callback === 'function') {
              callback(res.tempFilePath);
            }
          }
        });
      },
      fail(error) {
        console.log('canvasPutImageData', error);
      }
    });
  },
  processPhoto(resData, imageWidth, imageHeight) {
    var _that = this;
    //const ctx = wx.createCanvasContext(hiddenCanvasId);
    const ctx = _that.data.hiddenCanvasContext;
    // image position
    const imageX = 0;
    const imageY = 0;
    // size ratio
    var frameHeight = (imageHeight / imageWidth) * frameWidth;
    // save frame height
    if (_that.data.frameHeight === 0) {
      _that.setData({
        frameHeight: frameHeight,
      });
    }
    // option: compress image
    _that.compressPhoto(resData,
      imageWidth,
      imageHeight,
      frameWidth,
      frameHeight,
      function (photoPath) {
        // draw image on hidden canvas
        ctx.drawImage(photoPath, imageX, imageY, frameWidth, frameHeight);
        // waiting for drawing
        ctx.draw(false, function () {
          // get image data from hidden canvas
          wx.canvasGetImageData({
            canvasId: hiddenCanvasId,
            x: imageX,
            y: imageY,
            width: frameWidth,
            height: frameHeight,
            success(res) {
              // start
              var startDate = new Date();
              // process image
              _that.tracker.track(res.data, frameWidth, frameHeight);
              // end
              var endDate = new Date();
              console.log('cost time:', endDate - startDate, 'ms');
            }
          });
        });
      });
      
      // We can process images directly, but it will become slow.
      // process image directly
      //_that.tracker.track(resData, imageWidth, imageHeight);

  },
  startTacking() {
    var _that = this;
    var resData = null;
    var resWidth = 0;
    var resHeight = 0;
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
    const listener = context.onCameraFrame(function (res) {
      console.log('frame:', res.width, res.height);
      resData = new Uint8ClampedArray(res.data);
      resWidth = res.width;
      resHeight = res.height;
    });
    // start
    listener.start();
    // process
    const intervalId = setInterval(function () {
      if (resData) {
        _that.processPhoto(resData, resWidth, resHeight);
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
