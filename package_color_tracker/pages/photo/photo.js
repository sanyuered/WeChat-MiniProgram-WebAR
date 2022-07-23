const image = require('../../utils/imageBusiness.js')
const canvasId = 'canvasMask';
const maxCanvasWidth = 375;
const canvasWidth = 375;
const canvasHeight = 275;

Page({
  canvasContext: null,
  canvasDom: null,
  // videoContext: null,
  data: {
    notice: '',
    sampleUrl: null,
    patternImageUrl: null,
    videoUrl: null,
    videoTransform: '',
    isButtonDisabled: false,
    isVideoVisible: false,
    animationData: null,
    customColor: {
      r: 150,
      g: 150,
      b: 150,
    },
    colorRange: 5000,
    colorArray: ['yellow'],
  },
  onReady: function () {
    var _that = this;

    _that.getCanvasOfType2d();

    this.setData({
      sampleUrl: './5_color.jpg',
    });
  },
  onUnload: function () {
  },
  processPhoto(photoPath, imageWidth, imageHeight, ctx) {
    // var _that = this;

    // const ctx = wx.createCanvasContext(canvasId);
    var frameWidth = imageWidth;
    if (frameWidth > maxCanvasWidth) {
      frameWidth = maxCanvasWidth;
    }
    // canvas Height
    var frameHeight = Math.floor(frameWidth * (imageHeight / imageWidth));
    // draw image on canvas
    ctx.drawImage(photoPath, 0, 0, frameWidth, frameHeight);

    // get image data from canvas
    let res = ctx.getImageData(
      0,
      0,
      frameWidth,
      frameHeight);

    // process start
    image.detect(res.data,
      frameWidth,
      frameHeight,
      canvasWidth,
      canvasHeight);
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
  initSample() {
    var _that = this;
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
  takePhoto() {
    var _that = this;
    if (_that.data.isButtonDisabled) {
      return
    }

    image.initTracker(_that.canvasContext,
      _that.data.customColor,
      _that.data.colorRange,
      _that.data.colorArray);

    _that.initSample();

  },
  color_range_change(e) {
    this.setData({
      colorRange: e.detail.value,
    });
  },
  customColor_r_change(e) {
    this.setData({
      "customColor.r": e.detail.value,
    });
  },
  customColor_g_change(e) {
    this.setData({
      "customColor.g": e.detail.value,
    });
  },
  customColor_b_change(e) {
    this.setData({
      "customColor.b": e.detail.value,
    });
  },
  checkboxChange(e) {
    console.log('checkboxChange', e.detail.value)
    this.setData({
      colorArray: e.detail.value,
    });
  },
  error(e) {
    console.log(e.detail);
  },
});
