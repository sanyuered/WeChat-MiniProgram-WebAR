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
  canvasContext: null,
  canvasDom: null,
  videoContext: null,
  data: {
    notice: '',
    sampleUrl: 'sample.jpg',
    patternImageUrl: 'face_pattern.jpg',
    videoUrl: 'https://sanyuered.github.io/imgs/sample.mp4',
    videoTransform: '',
    isButtonDisabled: false,
    isVideoVisible:false,
    animationData:null,
  },
  onLoad: function () {
    var _that = this;
    // waiting for dom completed
    setTimeout(function () {
      image.initTracker();
      _that.getCanvasOfType2d();
    }, 150);
    _that.videoContext = wx.createVideoContext(videoMaskId)
  },
  onUnload: function () {
  },
  processPhoto(photoPath, imageWidth, imageHeight, ctx) {
    var _that = this;

    // const ctx = wx.createCanvasContext(canvasId);
    var canvasWidth = imageWidth;
    if (canvasWidth > maxCanvasWidth) {
      canvasWidth = maxCanvasWidth;
    }
    // canvas Height
    var canvasHeight = Math.floor(canvasWidth * (imageHeight / imageWidth));
    // draw image on canvas
    ctx.drawImage(photoPath, 0, 0, canvasWidth, canvasHeight);

    // get image data from canvas
    let res = ctx.getImageData(
      0,
      0,
      canvasWidth,
      canvasHeight);

    wx.showLoading({
      title: 'Detecting...',
    });
    _that.setData({
      isButtonDisabled: true,
    });

    // process start
    image.detect(res.data,
      canvasWidth,
      canvasHeight,
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
  getCanvasOfType2d() {
    var _that = this;
    wx.createSelectorQuery()
      .select('#' + canvasId)
      .fields({ node: true, size: true })
      .exec((res) => {
        const canvas2d = res[0].node;
        let ctx = canvas2d.getContext("2d");

        // needs to set the canvas size
        canvas2d.width = res[0].width;
        canvas2d.height = res[0].height;

        _that.canvasDom = canvas2d;
        _that.canvasContext = ctx;

      });
  },
  createImage(canvasDom, imgUrl, callback) {
    const image = canvasDom.createImage();
    image.onload = () => {
      callback(image);
    };
    image.onerror = (err) => {
      console.log("photo.js createImage", err);
    };
    image.src = imgUrl;
  },
  playMaskVideo() {
    this.videoContext.play();
  },
  takePhoto() {
    var _that = this;
    if (_that.data.isButtonDisabled) {
      return
    }

    _that.setData({
      isVideoVisible: true,
    });

    _that.playMaskVideo();

    _that.createImage(
      _that.canvasDom,
      _that.data.sampleUrl,
      function (image) {
        console.log('size of image:', image.width, image.height);
        _that.processPhoto(image,
          image.width,
          image.height,
          _that.canvasContext);
      })
  },
  error(e) {
    console.log(e.detail);
  }
})
