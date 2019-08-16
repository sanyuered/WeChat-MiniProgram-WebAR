const face = require('../../utils/faceBusiness.js')
// if it is taking photo
var isRunning = true;

Page({
  data: {
    btnText: 'Take a photo',
    devicePosition: 'front',
    showFaceRect: false,
    showFeaturePoint: false,
  },
  onLoad: function () {
    face.initTracker();
  },
  processPhoto(photoPath, imageWidth, imageHeight) {
    var _that = this;
    const ctx = wx.createCanvasContext(face.hiddenCanvasId);

    var canvasWidth = imageWidth;
    if (canvasWidth > face.maxCanvasWidth) {
      canvasWidth = face.maxCanvasWidth;
    }
    // canvas Height
    var canvasHeight = Math.floor(canvasWidth * (imageHeight / imageWidth));    
    // draw image on hidden canvas
    ctx.drawImage(photoPath, 0, 0, canvasWidth, canvasHeight);
    // waiting for drawing
    ctx.draw(false, function () {
      // get image data from hidden canvas
      wx.canvasGetImageData({
        canvasId: face.hiddenCanvasId,
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
        success(res) {
          console.log('size of canvas image', canvasWidth, canvasHeight);
          face.startTrack(res.data,
            canvasWidth,
            canvasHeight,
            photoPath,
            _that.data.showFaceRect,
            _that.data.showFeaturePoint);
        }
      });
    });
  },
  takePhoto() {
    var _that = this;
    const context = wx.createCameraContext();
    const ctx = wx.createCanvasContext(face.canvasId);
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
  switch1Change: function (e) {
    this.setData({
      showFaceRect: e.detail.value,
    });
  },
  switch2Change: function (e) {
    this.setData({
      showFeaturePoint: e.detail.value,
    });
  },
  error(e) {
    console.log(e.detail);
  }
})
