const image = require('../../utils/imageBusiness.js')
const canvasId = 'canvas2d';
const maxCanvasWidth = 375;
// a video
const videoMaskId = "videoMask";
// mask image
const trackPoint = {
  x: 187, // the width of the pattern image is 375
  y: 187, // the height of the pattern image is 375
};

Page({
  // canvasContext: null,
  // canvasDom: null,
  videoContext: null,
  data: {
    notice: '',
    sampleUrl: '/assets/sample.jpg',
    patternImageUrl: '/assets/face_pattern.jpg',
    videoUrl: 'https://sanyuered.github.io/imgs/sample.mp4',
    videoTransform: '',
    isButtonDisabled: false,
    isVideoVisible: false,
    animationData: null,
  },
  async onReady () {
    var _that = this;
    await image.initTracker();
    _that.videoContext = wx.createVideoContext(videoMaskId)
  },
  onUnload() {
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
    var _that = this;
    wx.showLoading({
      title: 'Detecting...',
    });
    // process start
    image.detect(imageData.data,
      imageData.width,
      imageData.height,
      function (event) {
        wx.hideLoading();
        _that.setData({
          isButtonDisabled: false,
        });
        var result = event.data;

        if (result && result.prediction) {
          // set the position
          image.updateMaskVideoPosition(result.prediction,
            _that,
            trackPoint,
            canvasWidth,
            canvasHeight)
          var message = "detect: " + result.prediction.goodMatch + " points, " + result.end + ' ms.';
          _that.setData({ notice: message });
        } else {
          // set the default position
          image.setMaskVideoDefaultPosition(_that);
          var message = 'No results.';
          _that.setData({ notice: message });
          console.log('detect:', message);
        }
      });
    // process end

  },
  playMaskVideo() {
    this.videoContext.play();
  },
  async takePhoto() {
    var _that = this;
    if (_that.data.isButtonDisabled) {
      return
    }

    _that.setData({
      isVideoVisible: true,
    });

    _that.playMaskVideo();

      const imageData = await _that.createImageElement(_that.data.sampleUrl)
      console.log('size of image:', imageData.width, imageData.height);
      _that.processPhoto(imageData);

  },
  error(e) {
    console.log(e.detail);
  }
})
