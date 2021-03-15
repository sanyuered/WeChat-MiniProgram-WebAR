const face = require('../../utils/faceBusiness.js')
const model = require('../../utils/modelBusiness.js');
const canvasId = 'canvas2d';
const canvasWebGLId = 'canvasWebGL';
const maxCanvasWidth = 375;
// a url of sprite image
const modelUrl = '../../utils/cat_beard.png';

Page({
  data: {
    btnText: 'Take a photo',
    devicePosition: 'front',
    // if it is taking a photo
    isRunning: true,
  },
  onLoad: function () {
    // load 3d model
    model.initThree(canvasWebGLId, modelUrl);
    face.initTracker();
  },
  onUnload: function () {
    model.stopAnimate();
    model.dispose();
  },
  processPhoto(photoPath, imageWidth, imageHeight) {
    var _that = this;
    const ctx = wx.createCanvasContext(canvasId);
    var canvasWidth = imageWidth;
    if (canvasWidth > maxCanvasWidth) {
      canvasWidth = maxCanvasWidth;
    }
    // canvas Height
    var canvasHeight = Math.floor(canvasWidth * (imageHeight / imageWidth));
    // draw image on hidden canvas
    ctx.drawImage(photoPath, 0, 0, canvasWidth, canvasHeight);
    // waiting for drawing
    ctx.draw(false, function () {
      // get image data from hidden canvas
      wx.canvasGetImageData({
        canvasId: canvasId,
        x: 0,
        y: 0,
        width: canvasWidth,
        height: canvasHeight,
        success(res) {
          console.log('size of canvas image', canvasWidth, canvasHeight);
          wx.showLoading({
            title: 'Detecting...',
          });
          // process start
          face.detect(res.data,
            canvasWidth,
            canvasHeight,
            function (result) {
              wx.hideLoading();
              if (result && result.prediction) {
                // set the rotation and position of the 3d model.    
                model.setModel(result.prediction,
                  canvasWidth,
                  canvasHeight);
                var frame = {
                  data: new Uint8Array(res.data),
                  width: res.width,
                  height: res.height,
                };
                // put the 3d model on the image
                model.setSceneBackground(frame);
              } else {
                var message = 'No results.';
                wx.showToast({
                  title: message,
                  icon: 'none'
                });
              }
            });
          // process end
        }
      });
    });
  },
  takePhoto() {
    var _that = this;
    const context = wx.createCameraContext();
    const ctx = wx.createCanvasContext(face.canvasId);
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
      // clear 2d canvas
      ctx.clearRect(0, 0);
      ctx.draw();
      // clear 3d canvas
      model.clearSceneBackground();
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
