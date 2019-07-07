
const tracking = require('../../utils/tracking.js')
const canvasId = 'canvas1';
const canvasWidth = 375;
const canvasHeight = 450;

Page({
  data: {
    btnText: 'Take a photo',
    isRunning: true,
    tracker: null,
    tempImagePath: null,
  },
  onLoad: function () {
    this.initTracking();
  },
  initTracking(){
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
    _that.tracker = new tracking.ColorTracker(['yellow','magenta','cyan']);
    _that.tracker.on('track', function (event) {
      if (event.data.length != 0) {
        console.log(event);
      }
      // draw photo on canvas
      ctx.drawImage(_that.data.tempImagePath, 0, 0,canvasWidth,canvasHeight);

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
        quality: 'medium',
        success: (res) => {
          _that.setData({
            tempImagePath: res.tempImagePath
          });
          console.log(res.tempImagePath);
          // draw photo on canvas
          ctx.drawImage(res.tempImagePath, 0, 0,canvasWidth,canvasHeight);
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
                // process images
                _that.tracker.track(res.data, res.width, res.height);
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
  error(e) {
    console.log(e.detail);
  }
})
