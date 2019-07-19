const tracking = require('../../utils/tracking.js')
const face = require('../../utils/face.js')
const mouth = require('../../utils/mouth.js')
const landmarks = require('../../utils/Landmarks.js')
const regressor = require('../../utils/Regressor.js')
const ImageTracker = require('../../utils/ImageTracker.js')
const canvasId = 'canvas1';
const hiddenCanvasId = 'hiddenCanvas';
// canvas width
const canvasWidth = 375;
// canvas height
const canvasHeight = 458;
// small frame size
const frameWidth = 141;
// face tracker parameter
const initialScale = 2;
// color tracker parameter
const minDimension = 4;
// pattern image resample levels
const resampleLevels = 4;
// pattern image url: relative url,temp url and network url.
const patternImageUrl = '../../face.jpg';
// pattern image width
var patternFrameWidth = 0;
// pattern image height
var patternFrameHeight = 0;
// pattern image min width
const patternFrameMinWidth = 141;
// time interval should be greater than cost time
const intervalTime = 600;
//pattern image height
var patternFrameHeight = 0;
// color tacker, face tracker, image tracker.
var tracker = null;
// camera listener
var listener = null;
// id of setInterval
var intervalId = null;
// height of frame size
var frameHeight = 0;
// context of canvas
var canvasContext = null;
// context of hidden canvas
var hiddenCanvasContext = null;
// last face tracking result
var lastLandmarks = null;
// last image tracking result
var lastTransform = null;
// pattern Image Array
var patternImageArray = [];

Page({
  data: {
    devicePosition: 'back',
  },
  onLoad: function (option) {
    canvasContext = wx.createCanvasContext(canvasId);
    hiddenCanvasContext = wx.createCanvasContext(hiddenCanvasId);
    this.initTracking(option.type);
  },
  onUnload: function () {
    this.stopTacking();
  },
  drawByColorTracker() {
    var _that = this;
    //const ctx = wx.createCanvasContext(canvasId);
    const ctx = canvasContext;
    tracker = new tracking.ColorTracker(['yellow', 'magenta', 'cyan']);
    tracker.setMinDimension(minDimension);
    tracker.on('track', function (event) {
      if (event.data.length != 0) {
        console.log(event);
      }
      // size ratio 
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
          rect.color = tracker.customColor;
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
  drawByFaceTracker() {
    var _that = this;
    //const ctx = wx.createCanvasContext(canvasId);
    const ctx = canvasContext;
    tracking.ViolaJones.classifiers.face = face;
    tracking.LBF.LandmarksData = landmarks;
    tracking.LBF.RegressorData = regressor;
    // maxNumStages depends on children of "Regressor.js"
    tracking.LBF.maxNumStages = 1;

    // new LandmarksTracker
    tracker = new tracking.LandmarksTracker();
    tracker.setInitialScale(initialScale);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);
    tracker.on('track', function (event) {
      if (!event.data) {
        return;
      }
      console.log('event.data', event.data);

      if (!event.data.landmarks) {
        var message = 'No results found.';
        console.log(message);
      }else{
        //save last landmarks
        lastLandmarks = event.data.landmarks;
      }


      // size ratio 
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;

      /*
      // draw rect
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
      */

      // draw points
      if (lastLandmarks) {
        lastLandmarks.forEach(function (landmarks) {
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
  drawByObjectTracker() {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
    tracking.ViolaJones.classifiers.mouth = mouth;
    tracker = new tracking.ObjectTracker(['mouth']);
    tracker.setInitialScale(1);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);
    tracker.on('track', function (event) {
      if (event.data != null) {
        console.log('event.data', event.data);
      }
      // size ratio 
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;
      // draw tracking points
      event.data.forEach(function (rect) {
        // scale
        rect.x = Math.round(rect.x * widthRatio);
        rect.y = Math.round(rect.y * heightRatio);
        rect.width = Math.round(rect.width * widthRatio);
        rect.height = Math.round(rect.height * heightRatio);
        // draw
        ctx.strokeStyle = rect.color;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        // ctx.font = '11px sans-serif';
        ctx.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
        ctx.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);
      });
      ctx.draw();
    });
    // start
    _that.startTacking();
  },
  getPatternImage(patternImageUrl, callback) {
    var _that = this;
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
        if (patternFrameWidth > patternFrameMinWidth) {
          patternFrameWidth = patternFrameMinWidth;
          patternFrameHeight = (res.height / res.width) * patternFrameMinWidth;
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
  },
  drawByImageTracker() {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
    // get patter image
    _that.getPatternImage(patternImageUrl, function (patternImageArray) {
      tracker = new ImageTracker(patternImageArray);
      tracker.on('track', function (event) {
        if (!event.data) {
          return;
        }
        console.log('event.data', event.data);

        if (event.data.goodMatch < 10) {
          var message = 'No results found.';
          console.log(message);
        }else{      
           //save last transform
           lastTransform = event.data.transform;
        }

        var patternWidth = event.data.width;
        var patternHeight = event.data.height;
        // size ratio of origin image
        var widthRatio = canvasWidth / frameWidth;
        var heightRatio = canvasHeight / frameHeight;

        if (lastTransform) {
          var transformArray = lastTransform.data;
          var a = transformArray[0];
          var c = transformArray[1];
          var e = transformArray[2];
          var b = transformArray[3];
          var d = transformArray[4];
          var f = transformArray[5];
          console.log(a, b, c, d, e, f);
          // transform canvas
          ctx.transform(a, b, c, d, e * widthRatio, f * heightRatio);
          // draw sample pattern on canvas
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          // according to the size of origin image
          ctx.fillRect(0, 0, patternWidth * widthRatio, patternHeight * heightRatio);
        }
        ctx.draw();
      });
    });
    // start
    _that.startTacking();
  },
  stopTacking() {
    clearInterval(intervalId);
    if (listener) {
      listener.stop();
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
    const ctx = hiddenCanvasContext;
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
    const ctx = hiddenCanvasContext;
    // image position
    const imageX = 0;
    const imageY = 0;
    // size ratio
    frameHeight = (imageHeight / imageWidth) * frameWidth;
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
              tracker.track(res.data, frameWidth, frameHeight);
              // end
              var endDate = new Date();
              console.log('cost time:', endDate - startDate, 'ms');
            }
          });
        });
      });

    // We can process images directly, but it will become slow.
    // process image directly
    //tracker.track(resData, imageWidth, imageHeight);

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
    listener = context.onCameraFrame(function (res) {
      console.log('frame:', res.width, res.height);
      resData = new Uint8ClampedArray(res.data);
      resWidth = res.width;
      resHeight = res.height;
    });
    // start
    listener.start();
    // process
    intervalId = setInterval(function () {
      if (resData) {
        _that.processPhoto(resData, resWidth, resHeight);
      }
    }, intervalTime);

  },
  initTracking(type) {
    if (type === 'colorTracker') {
      this.drawByColorTracker();
    }
    else if (type === 'faceTracker') {
      this.drawByFaceTracker();
    }
    else if (type === 'imageTracker') {
      this.drawByImageTracker();
    }
    else if (type === 'objectTracker') {
      this.drawByObjectTracker();
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
