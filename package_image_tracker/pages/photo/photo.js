const imageBusiness = require('../../utils/imageBusiness.js');
const model = require('../../utils/modelBusiness.js');
const canvasWebGLId = 'canvasWebGL';
// a url of a image
const modelUrl = '/assets/cat_beard.png';

Page({
  data: {
    sampleImage: '/assets/sample.jpg',
    patternImageUrl: '/assets/face_pattern.jpg',
  },
  async onReady() {
    // load 3d model
    model.initThree(canvasWebGLId, modelUrl);
    const patternImageArray = await imageBusiness.getPatternData()
    imageBusiness.initTracker({ patternImageArray })
  },
  onUnload() {
    model.stopAnimate();
    model.dispose();
  },
  processPhoto(frameData, frameWidth, frameHeight) {
    wx.showLoading({
      title: 'Detecting...',
    });
    // process start
    imageBusiness.detect({
      type: 'photo',
      frameData: frameData,
      width: frameWidth,
      height: frameHeight,
      callback: function (event) {
        wx.hideLoading();
        var result = event.data;

        if (result && result.prediction) {
          // set the rotation and position of the 3d model.    
          model.setModel(result.prediction,
            frameWidth,
            frameHeight);
        } else {
          var message = 'No results.';
          wx.showToast({
            title: message,
            icon: 'none'
          });
        }
      }
    });
    // process end

  },
  async takePhoto() {
    var _that = this;

    const imageData = await imageBusiness.getPhotoData(_that.data.sampleImage)
    console.log('size of image:', imageData.width, imageData.height);
    _that.processPhoto(imageData.data, imageData.width, imageData.height);
  },
})
