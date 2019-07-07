
const tracking = require('../../utils/tracking.js')
const canvasId = 'canvas1';
const canvasWidth = 375;
const canvasHeight = 500;
const frameWidth = 480;
const frameHeight = 640;
const intervalTime = 30;

Page({
  data: {
    tracker: null,
    listener: null,
    intervalId: null,
  },
  onLoad: function () {
    this.initTracking();
  },
  onUnload: function () {
    this.stopTacking();
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
        icon: "none"
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
    var intervalId = setInterval(function () {
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
  initTracking() {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
    _that.tracker = new tracking.ColorTracker(['yellow', 'magenta', 'cyan']);
    _that.tracker.on('track', function (event) {
      if (event.data.length != 0) {
        console.log(event);
      }
      
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
  error(e) {
    console.log(e.detail);
  }
})
