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
const canvasHeight = 450;
// small frame size
const frameWidth = 200;
// face tracker parameter
const initialScale = 2;
// color tracker parameter
const minDimension = 4;
// pattern image url: relative url,temp url and network url.
const patternImageUrl = '../../face.jpg';
// pattern image width
const patternFrameWidth = 200;
// if is taking photo
var isRunning = true;
// color tacker, face tracker, image tracker.
var tracker = null;
// temp photo path
var tempImagePath = null;
// height of frame size
var frameHeight = 0;
// temp pattern Image Path
var tempPatternImagePath = null;
//pattern image height
var patternFrameHeight = 0;

Page({
  data: {
    btnText: 'Take a photo',
    devicePosition: 'back',
  },
  onLoad: function (option) {
    this.initTracking(option.type);
  },
  drawByColorTracker() {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
    tracker = new tracking.ColorTracker(['yellow', 'magenta', 'cyan']);
    tracker.setMinDimension(minDimension);
    tracker.on('track', function (event) {
      if (event.data.length != 0) {
        console.log(event);
      }
      // draw photo on canvas
      ctx.drawImage(tempImagePath, 0, 0, canvasWidth, canvasHeight);
      // size ratio 
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;
      // draw tracking points
      event.data.forEach(function (rect) {
        if (rect.color === 'custom') {
          rect.color = tracker.customColor;
        }
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
  },
  drawByFaceTracker() {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
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
      console.log(event.data);
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
      // size ratio 
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
          ctx.fillText('x: ' + rect.x, rect.x + rect.width + 5, rect.y + 11);
          ctx.fillText('y: ' + rect.y, rect.x + rect.width + 5, rect.y + 22);
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
            ctx.arc(x, y, 1, 0, 2 * Math.PI);
            ctx.fill();
          }
        });
      }

      ctx.draw();
    });
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
      if (event.data.length != 0) {
        console.log(event);
      }
      if (event.data.length === 0) {
        var message = 'No results found.';
        console.log(message);
        wx.showToast({
          title: message,
          icon: 'none'
        });
      }
      // draw photo on canvas
      ctx.drawImage(tempImagePath, 0, 0, canvasWidth, canvasHeight);
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
  },
  getPatternImage(patternImageUrl, callback) {
    var _that = this;
    const ctx = wx.createCanvasContext(hiddenCanvasId);

    wx.getImageInfo({
      src: patternImageUrl,
      success: function (res) {
        // size ratio
        patternFrameHeight = (res.height / res.width) * patternFrameWidth;
        // for test
        tempPatternImagePath = res.path;
        // draw image on canvas
        ctx.drawImage(res.path, 0, 0, frameWidth, patternFrameHeight);
        ctx.draw(false, function () {
          wx.canvasGetImageData({
            canvasId: hiddenCanvasId,
            x: 0,
            y: 0,
            width: frameWidth,
            height: patternFrameHeight,
            success(canvasRes) {
              if (typeof callback === 'function') {
                console.log('pattern image', canvasRes.width, canvasRes.height);
                callback(canvasRes.data, canvasRes.width, canvasRes.height);
              }
            }
          });
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
    _that.getPatternImage(patternImageUrl, function (patternPixels, width, height) {
      tracker = new ImageTracker(patternPixels, width, height);
      tracker.on('track', function (event) {
        if (event.data != null) {
          console.log('event.data', event.data);
        }
        if (event.data.transform.data.length === 0) {
          var message = 'No results found.';
          console.log(message);
          wx.showToast({
            title: message,
            icon: 'none'
          });
        }
        // draw origin photo on canvas
        ctx.drawImage(tempImagePath, 0, 0, canvasWidth, canvasHeight);
        // size ratio 
        var widthRatio = canvasWidth / frameWidth;
        var heightRatio = canvasHeight / frameHeight;

        if (event.data) {
          var transformArray = event.data.transform.data;
          var a = transformArray[0];
          var c = transformArray[1];
          var e = transformArray[2];
          var b = transformArray[3];
          var d = transformArray[4];
          var f = transformArray[5];
          console.log(a, b, c, d, e, f);
          // transform canvas
          ctx.transform(a, b, c, d, e* widthRatio, f* heightRatio);

          // draw sample pattern on canvas
          ctx.fillStyle = 'rgba(0,0,0,0.5)';
          ctx.fillRect(0, 0, patternFrameWidth * widthRatio, patternFrameHeight * heightRatio);
        }
        ctx.draw();
      });
    });
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
  processPhoto(photoPath, imageWidth, imageHeight) {
    var _that = this;
    const ctx = wx.createCanvasContext(hiddenCanvasId);
    // image position
    const imageX = 0;
    const imageY = 0;
    // size ratio
    frameHeight = (imageHeight / imageWidth) * frameWidth;
    // save origin image path
    tempImagePath = photoPath;
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
  },
  takePhoto() {
    var _that = this;
    const context = wx.createCameraContext();
    const ctx = wx.createCanvasContext(canvasId);
    if (isRunning) {
      _that.setData({
        btnText: 'Retry',
      });
      isRunning = false;
      // take a photo
      context.takePhoto({
        quality: 'normal',
        success: (res) => {
          var photoPath = res.tempImagePath;
          //get size of image 
          wx.getImageInfo({
            src: photoPath,
            success(res) {
              console.log('size of image:', res.width, res.height);
              _that.processPhoto(photoPath, res.width, res.height);
            }
          });
        }
      });
    }
    else {
      _that.setData({
        btnText: 'Take a photo',
      });
      isRunning = true;
      // clear canvas
      ctx.draw();
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
