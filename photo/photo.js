
const tracking = require('../../utils/tracking.js')
const face = require('../../utils/face.js')
const landmarks = require('../../utils/Landmarks.js')
const regressor = require('../../utils/Regressor.js')
const canvasId = 'canvas1';
const hiddenCanvasId = 'hiddenCanvas';
// canvas size
const canvasWidth = 375;
const canvasHeight = 450;
// small frame size
const frameWidth = 200;
// face tracker parameter
const initialScale = 2;
// color tracker parameter
const minDimension = 4;

Page({
  data: {
    btnText: 'Take a photo',
    isRunning: true,
    tracker: null,
    tempImagePath: null,
    devicePosition: 'back',
    // height of frame size
    frameHeight: 0,
  },
  onLoad: function (option) {
    this.initTracking(option.type);
  },
  drawByColor() {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
    _that.tracker = new tracking.ColorTracker(['yellow', 'magenta', 'cyan']);
    _that.tracker.setMinDimension(minDimension);
    _that.tracker.on('track', function (event) {
      if (event.data.length != 0) {
        console.log(event);
      }
      // draw photo on canvas
      ctx.drawImage(_that.data.tempImagePath, 0, 0, canvasWidth, canvasHeight);
      // size ratio 
      var frameHeight = _that.data.frameHeight;
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;
      // draw tracking points
      event.data.forEach(function (rect) {
        if (rect.color === 'custom') {
          rect.color = _that.tracker.customColor;
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
    _that.tracker.setInitialScale(initialScale);
    _that.tracker.setStepSize(2);
    _that.tracker.setEdgesDensity(0.1);
    _that.tracker.on('track', function (event) {
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
      ctx.drawImage(_that.data.tempImagePath, 0, 0, canvasWidth, canvasHeight);
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
  initTracking(type) {
    if (type === 'color') {
      this.drawByColor();
    }
    else if (type === 'face') {
      this.drawByFace();
    }
  },
  processPhoto(photoPath, imageWidth, imageHeight) {
    var _that = this;
    const ctx = wx.createCanvasContext(hiddenCanvasId);
    // image position
    const imageX = 0;
    const imageY = 0;
    // size ratio
    var frameHeight = (imageHeight / imageWidth) * frameWidth;
    // save origin image and frame height
    _that.setData({
      tempImagePath: photoPath,
      frameHeight: frameHeight,
    });
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
  },
  takePhoto() {
    var _that = this;
    const context = wx.createCameraContext();
    const ctx = wx.createCanvasContext(canvasId);
    if (_that.data.isRunning) {
      _that.setData({
        btnText: 'Retry',
        isRunning: false,
      });
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
        isRunning: true,
      });
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
