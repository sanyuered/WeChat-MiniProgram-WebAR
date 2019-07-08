
const tracking = require('../../utils/tracking.js')
const face = require('../../utils/face.js')
const landmarks = require('../../utils/Landmarks.js')
const regressor = require('../../utils/Regressor.js')
const canvasId = 'canvas1';
const canvasWidth = 375;
const canvasHeight = 450;

Page({
  data: {
    btnText: 'Take a photo',
    isRunning: true,
    tracker: null,
    tempImagePath: null,
    devicePosition: 'back',
  },
  onLoad: function (option) {
    this.initTracking(option.type);
  },
  drawByColor() {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);

    _that.tracker = new tracking.ColorTracker(['yellow', 'magenta', 'cyan']);
    _that.tracker.on('track', function (event) {
      if (event.data.length != 0) {
        console.log(event);
      }
      // draw photo on canvas
      ctx.drawImage(_that.data.tempImagePath, 0, 0, canvasWidth, canvasHeight);
      // draw tracking points
      event.data.forEach(function (rect) {
        if (rect.color === 'custom') {
          rect.color = _that.tracker.customColor;
        }
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
    _that.tracker.setInitialScale(4);
    _that.tracker.setStepSize(2);
    _that.tracker.setEdgesDensity(0.1);
    _that.tracker.on('track', function (event) {
      if (!event.data) {
        return;
      }

      if (event.data.faces.length === 0) {
        var message = 'No results found.';
        console.log(message);
        wx.showToast({
          title: message,
          icon: 'none'
        });
      }
      console.log(event.data);

      // draw photo on canvas
      ctx.drawImage(_that.data.tempImagePath, 0, 0, canvasWidth, canvasHeight);

      // draw rect
      if (event.data.faces) {
        event.data.faces.forEach(function (rect) {
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
            ctx.beginPath();
            ctx.fillStyle = "#fff";
            ctx.arc(landmarks[landmark][0], landmarks[landmark][1], 1, 0, 2 * Math.PI);
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
          _that.setData({
            tempImagePath: photoPath,
          });
          console.log(photoPath);
          // draw photo on canvas
          ctx.drawImage(photoPath, 0, 0, canvasWidth, canvasHeight);
          // waiting for drawing
          ctx.draw(false, function () {
            // get image data from canvas
            wx.canvasGetImageData({
              canvasId: canvasId,
              x: 0,
              y: 0,
              width: canvasWidth,
              height: canvasHeight,
              success(res) {
                // process image
                _that.tracker.track(res.data, canvasWidth, canvasHeight);
                res = null;
              }
            });
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
