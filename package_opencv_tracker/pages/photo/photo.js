// 识别图地址
const patternImage = './face_pattern.jpg'
// 画布最大宽度
const maxCanvasWidth = 375
const canvasWebGLId = 'canvasWebGL';
const model = require('../../utils/modelBusiness.js');
const imageTracker = require('../../utils/imageTracker.js');
// a url of a image
const modelUrl = '../../utils/cat_beard.png';
var canvasWidth
var canvasHeight

Page({
  data: {
    btnText: 'Take a photo',
    devicePosition: 'back',
    // if it is taking a photo
    isRunning: true,
  },
  onReady() {
    var _that = this;
    // load 3d model
    model.initThree(canvasWebGLId, modelUrl);

    setTimeout(async function () {
      // 识别图
      const patternImageData = await _that.createImageElement(patternImage)
      imageTracker.initTemplateImage(patternImageData)
    }, 1000)

  },
  onUnload() {
    model.stopAnimate();
    model.dispose();
    imageTracker.dispose()
  },
  // 获取图像数据和调整图像大小
  getImageData(image, offscreenCanvas) {
    var _that = this
    canvasWidth = image.width;
    if (canvasWidth > maxCanvasWidth) {
      canvasWidth = maxCanvasWidth;
    }
    // canvas Height
    canvasHeight = Math.floor(canvasWidth * (image.height / image.width));
    // 离屏画布的宽度和高度不能小于图像的
    offscreenCanvas.width = canvasWidth;
    offscreenCanvas.height = canvasHeight;
    // draw image on canvas
    var ctx = offscreenCanvas.getContext('2d')
    ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
    // get image data from canvas
    var imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

    return imgData
  },
  // 创建图像对象
  async createImageElement(imgUrl) {
    var _that = this
    // 创建2d类型的离屏画布（需要微信基础库2.16.1以上）
    var offscreenCanvas = wx.createOffscreenCanvas({ type: '2d' });
    const image = offscreenCanvas.createImage();
    await new Promise(function (resolve, reject) {
      image.onload = resolve
      image.onerror = reject
      image.src = imgUrl
    })
    const imageData = _that.getImageData(image, offscreenCanvas)
    return imageData
  },
  processPhoto(imageData) {

    // process start
    var result = imageTracker.detect(imageData)

    if (result && result.prediction) {
      // set the rotation and position of the 3d model.    
      model.setModel(result.prediction,
        canvasWidth,
        canvasHeight);
      var frame = {
        data: new Uint8Array(imageData.data),
        width: imageData.width,
        height: imageData.height,
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
    // process end

  },
   takePhoto() {
    var _that = this;

    if (_that.data.isRunning) {
      _that.setData({
        btnText: 'Retry',
        isRunning: false,
      });

      // take a photo
      const context = wx.createCameraContext();
      context.takePhoto({
        quality: 'normal',
        success: async (res) => {
          var photoPath = res.tempImagePath;
          const imageData = await _that.createImageElement(photoPath)
          console.log('size of image:', imageData.width, imageData.height);
          _that.processPhoto(imageData);
        }
      });

    }
    else {
      _that.setData({
        btnText: 'Take a photo',
        isRunning: true,
      });

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
