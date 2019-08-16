const face = require('../../utils/faceBusiness.js')
// JavaScript on Android Wechat runs faster than iOS.
var speedMaxCount = 10;
// camera listener
var listener = null;

Page({
  data: {
    devicePosition: 'front',
    cameraStyle: 'camera_Android',
  },
  onReady: function () {
    var _that = this;
    // set speedMaxCount
    wx.getSystemInfo({
      success(res) {
        console.log(res.system);
        if (res.system.indexOf('iOS') !== -1) {
          speedMaxCount = 120;
          _that.setData({
            cameraStyle: 'camera_iOS',
          });
        }
      }
    })
  },
  onLoad: function () {
    // init
    face.initTracker();
    // start
    this.startTacking();
  },
  onUnload: function () {
    this.stopTacking();
    console.log('onUnload', 'listener is stop');
  },
  startTacking() {
    var count = 0;
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
      if (count < speedMaxCount) {
        count++;
        return;
      }
      count = 0;
      console.log('onCameraFrame:', res.width, res.height);
      var resData = new Uint8ClampedArray(res.data);
      var resWidth = res.width;
      var resHeight = res.height;
      // process
      face.startTrack(resData,
        resWidth,
        resHeight,
        null,
        false,
        false,
      );
    });
    // start
    listener.start();
    console.log('startTacking', 'listener is start');
  },
  stopTacking() {
    if (listener) {
      listener.stop();
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
