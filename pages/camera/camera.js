const tracking = require('../../utils/tracking.js')
const face = require('../../utils/face.js')
const mouth = require('../../utils/mouth.js')
const landmarksData = require('../../utils/Landmarks.js')
const regressorData = require('../../utils/Regressor.js')
const ImageTracker = require('../../utils/ImageTracker.js')
const canvasId = 'canvas1';
const hiddenCanvasId = 'hiddenCanvas';
// canvas width
const canvasWidth = 375;
// canvas height
var canvasHeight = 0;
// color tracker parameter
const minDimension = 4;
// small frame size
var frameWidth = 288;
// face tracker parameter
const initialScale = 4;
// pattern image resample levels
const resampleLevels = 4;
// pattern image url: relative url,temp url and network url.
const patternImageUrl = '../../face.jpg';
// pattern image width
var patternFrameWidth = 0;
// pattern image height
var patternFrameHeight = 0;
// pattern image max width
const patternFrameMaxWidth = 265;
// decoration image for image tracker 
const decorationImageUrl = '../../cat_beard.png';
// color tacker, face tracker, image tracker.
var tracker = null;
// height of frame size
var frameHeight = 0;
// context of canvas
var canvasContext = null;
// context of hidden canvas
var hiddenCanvasContext = null;
// last face tracking result
var lastLandmarks = null;
// last image tracking result
var lastTransform = null;
// pattern Image Array
var patternImageArray = [];
// time interval should be greater than cost time
// Because JavaScript on Android Wechat runs faster than iOS, the parameter "intervalTime" can be less than 1200(ms).
const intervalTime = 1200;
// camera listener
var listener = null;
// id of setInterval
var intervalId = null;

Page({
  data: {
    devicePosition: 'back',
  },
  onLoad: function (option) {
    canvasContext = wx.createCanvasContext(canvasId);
    hiddenCanvasContext = wx.createCanvasContext(hiddenCanvasId);
    this.initTracking(option.type);
  },
  onUnload: function () {
    this.stopTacking();
    console.log('onUnload', 'listener is stop');
  },
  drawByColorTracker() {
    var _that = this;
    const ctx = canvasContext;
    tracker = new tracking.ColorTracker(['yellow', 'magenta', 'cyan']);
    tracker.setMinDimension(minDimension);
    tracker.on('track', function (event) {
      if (event.data.length != 0) {
        console.log(event);
      }
      // size ratio 
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;
      // draw tracking points
      event.data.forEach(function (rect) {
        // scale
        rect.x = Math.round(rect.x * widthRatio);
        rect.y = Math.round(rect.y * heightRatio);
        rect.width = Math.round(rect.width * widthRatio);
        rect.height = Math.round(rect.height * heightRatio);
        // custom Color
        if (rect.color === 'custom') {
          rect.color = tracker.customColor;
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
  drawFaceDecoration(landmarks, ctx) {
    var _that = this;
    var srcPoints = [];
    var destPoints = [];
    var widthRatio = frameWidth / 375;
    var heightRatio = frameHeight / 375;
    // 4 source points
    // The numbers 108.7264383 and 109.1273706 are positions on picture "cat_beard.png".
    // The picture "cat_beard.png" width is 375 and height is 375.
    srcPoints.push({
      x: 145.3 * widthRatio,
      y: 140.8 * heightRatio,
    });
    srcPoints.push({
      x: 215.5 * widthRatio,
      y: 140.2 * heightRatio,
    });
    srcPoints.push({
      x: 155.57 * widthRatio,
      y: 222.19 * heightRatio,
    });
    srcPoints.push({
      x: 217.04 * widthRatio,
      y: 221.27 * heightRatio,
    });
    // 4 destion points
    // The point index 20, 24, 27 and 29 are index of feature points on the face.
    destPoints.push({
      x: landmarks[20][0],
      y: landmarks[20][1],
    });
    destPoints.push({
      x: landmarks[24][0],
      y: landmarks[24][1],
    });
    destPoints.push({
      x: landmarks[27][0],
      y: landmarks[27][1],
    });
    destPoints.push({
      x: landmarks[29][0],
      y: landmarks[29][1],
    });
    // get transform from source to destion
    var transformData = ImageTracker.perspective_transform(
      srcPoints[0].x, srcPoints[0].y, destPoints[0].x, destPoints[0].y,
      srcPoints[1].x, srcPoints[1].y, destPoints[1].x, destPoints[1].y,
      srcPoints[2].x, srcPoints[2].y, destPoints[2].x, destPoints[2].y,
      srcPoints[3].x, srcPoints[3].y, destPoints[3].x, destPoints[3].y,
    );

    //draw image on UI
    _that.drawImageOnUI(transformData.data,
      canvasWidth,
      canvasHeight,
      decorationImageUrl,
      ctx);
  },
  drawByFaceTracker() {
    var _that = this;
    const ctx = canvasContext;
    tracking.ViolaJones.classifiers.face = face;
    tracking.LBF.LandmarksData = landmarksData;
    tracking.LBF.RegressorData = regressorData;
    // maxNumStages depends on children of "Regressor.js"
    tracking.LBF.maxNumStages = 1;

    // new LandmarksTracker
    tracker = new tracking.LandmarksTracker();
    tracker.setInitialScale(initialScale);
    tracker.setStepSize(1);
    tracker.setEdgesDensity(0.1);
    tracker.on('track', function (event) {
      if (!event.data) {
        return;
      }
      console.log('event.data', event.data);

      if (!event.data.landmarks) {
        var message = 'No results found.';
        console.log(message);
      } else {
        //save last landmarks
        lastLandmarks = event.data.landmarks;
      }
      // size ratio 
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;
      // draw rect
      event.data.faces.forEach(function (rect) {
        // scale
        rect.x = Math.round(rect.x * widthRatio);
        rect.y = Math.round(rect.y * heightRatio);
        rect.width = Math.round(rect.width * widthRatio);
        rect.height = Math.round(rect.height * heightRatio);
        // draw
        ctx.strokeStyle = '#a64ceb';
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        //ctx.font = '11px sans-serif';
        ctx.fillStyle = "#fff";
        ctx.fillText('x:' + rect.x, rect.x + rect.width + 5, rect.y + 11);
        ctx.fillText('y:' + rect.y, rect.x + rect.width + 5, rect.y + 22);
      });

      // draw points
      if (lastLandmarks) {
        lastLandmarks.forEach(function (landmarks) {
          for (var i = 0; i < landmarks.length; i++) {
            var landmark = landmarks[i];
            var x = landmark[0];
            var y = landmark[1];
            // scale
            x = Math.round(x * widthRatio);
            y = Math.round(y * heightRatio);
            // draw
            ctx.beginPath();
            ctx.fillStyle = "#fff";
            ctx.arc(x, y, 1, 0, 2 * Math.PI);
            ctx.fill();
            ctx.fillText(i, x + 3, y + 3);
          }
        });
      }

      if (event.data.landmarks.length > 0) {
        // draw face decoration
        _that.drawFaceDecoration(event.data.landmarks[0], ctx);
      }
      // function drawImageOnUI() will invoke function draw().
      //ctx.draw();
    });
    // start
    _that.startTacking();
  },
  drawByObjectTracker() {
    var _that = this;
    const ctx = canvasContext;
    tracking.ViolaJones.classifiers.mouth = mouth;
    tracker = new tracking.ObjectTracker(['mouth']);
    tracker.setInitialScale(initialScale);
    tracker.setStepSize(2);
    tracker.setEdgesDensity(0.1);
    tracker.on('track', function (event) {
      if (event.data != null) {
        console.log('event.data', event.data);
      }
      // size ratio 
      var widthRatio = canvasWidth / frameWidth;
      var heightRatio = canvasHeight / frameHeight;
      // draw tracking points
      event.data.forEach(function (rect) {
        // scale
        rect.x = Math.round(rect.x * widthRatio);
        rect.y = Math.round(rect.y * heightRatio);
        rect.width = Math.round(rect.width * widthRatio);
        rect.height = Math.round(rect.height * heightRatio);
        // draw
        ctx.strokeStyle = rect.color;
        ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
        // ctx.font = '11px sans-serif';
        ctx.fillText('x: ' + rect.x + 'px', rect.x + rect.width + 5, rect.y + 11);
        ctx.fillText('y: ' + rect.y + 'px', rect.x + rect.width + 5, rect.y + 22);
      });
      ctx.draw();
    });
    // start
    _that.startTacking();
  },
  getPatternImage(patternImageUrl, callback) {
    var _that = this;
    // magic number
    const sc_inc = Math.sqrt(2.0);
    const ctx = hiddenCanvasContext;
    // init
    patternImageArray = [];

    wx.getImageInfo({
      src: patternImageUrl,
      success: function (res) {
        // pattern image temp path
        tempPatternImagePath = res.path;
        // pattern image size
        patternFrameWidth = res.width;
        patternFrameHeight = res.height;

        // reduce image size to increase image process speed
        if (patternFrameWidth > patternFrameMaxWidth) {
          patternFrameWidth = patternFrameMaxWidth;
          patternFrameHeight = (res.height / res.width) * patternFrameMaxWidth;
        }

        // resample width and height
        var newWidth = patternFrameWidth;
        var newHeight = patternFrameHeight;
        var imageX = 0;

        for (var i = 0; i < resampleLevels; i++) {
          // draw image on canvas
          ctx.drawImage(tempPatternImagePath, imageX, 0, newWidth, newHeight);
          // resample
          imageX += newWidth;
          newWidth = Math.round(newWidth / sc_inc);
          newHeight = Math.round(newHeight / sc_inc);
        }

        ctx.draw(false, function () {
          imageX = 0;
          newWidth = patternFrameWidth;
          newHeight = patternFrameHeight;
          for (var i = 0; i < resampleLevels; i++) {
            wx.canvasGetImageData({
              canvasId: hiddenCanvasId,
              x: imageX,
              y: 0,
              width: newWidth,
              height: newHeight,
              success(canvasRes) {
                console.log('resample pattern image', canvasRes.width, canvasRes.height);
                patternImageArray.push({
                  pixels: canvasRes.data,
                  width: canvasRes.width,
                  height: canvasRes.height,
                });
                if (patternImageArray.length === resampleLevels) {
                  if (typeof callback === 'function') {
                    callback(patternImageArray);
                  }
                }
              }
            });
            // resample
            imageX += newWidth;
            newWidth = Math.round(newWidth / sc_inc);
            newHeight = Math.round(newHeight / sc_inc);
          }
        });
      },
      fail: function (error) {
        console.log('getPatternImage', error);
      }
    });
  },
  drawImageOnUI(transformData, patternWidth, patternHeight, imageUrl, ctx) {
    var _that = this;
    // avoid to get hidden images existed
    const offsetLeft = canvasWidth;
    const hiddenCtx = hiddenCanvasContext;
    hiddenCtx.drawImage(imageUrl, 0, 0, patternWidth, patternHeight);
    hiddenCtx.draw(false, function () {
      // get image data of srcImage
      wx.canvasGetImageData({
        canvasId: hiddenCanvasId,
        x: 0,
        y: 0,
        width: patternWidth,
        height: patternHeight,
        success(srcImage) {
          // create a image data of destImage
          wx.canvasGetImageData({
            canvasId: hiddenCanvasId,
            x: offsetLeft,
            y: 0,
            width: canvasWidth,
            height: canvasHeight,
            success(destImage) {
              // invert the transform for function "warp_perspective_color" 
              ImageTracker.invert_transform({ data: transformData });
              // warp perspective
              ImageTracker.warp_perspective_color(
                srcImage,
                destImage,
                transformData);
              var itemData = destImage.data;      
              // convert from black to transparent.
              for (var i = 0; i < itemData.length; i = i + 4) {
                if (itemData[i] === 0 &&
                  itemData[i + 1] === 0 &&
                  itemData[i + 2] === 0 &&
                  itemData[i + 3] !== 0) {
                  itemData[i + 3] = 0;
                }
              }
              // put image data
              wx.canvasPutImageData({
                canvasId: canvasId,
                x: 0,
                y: 0,
                width: canvasWidth,
                height: canvasHeight,
                data: itemData,
                success(res) {
                  console.log('drawImageOnUI', 'completed');
                },
                fail(errorMsg) {
                  console.log('drawImageOnUI', errorMsg);
                }
              });
            }
          });
        }
      });
    });
  },
  drawByImageTracker() {
    var _that = this;
    const ctx = canvasContext;

    // get patter image
    _that.getPatternImage(patternImageUrl, function (patternImageArray) {
      tracker = new ImageTracker(patternImageArray);
      tracker.on('track', function (event) {
        if (!event.data) {
          return;
        }
        console.log('event.data', event.data);

        if (event.data.goodMatch < 10) {
          var message = 'No results found.';
          console.log(message);
        } else {
          //save last transform
          lastTransform = event.data.transform;
        }

        if (lastTransform) {
          var transformArray = lastTransform.data;
          var ratio = canvasHeight / canvasWidth;
          _that.drawImageOnUI(transformArray,
            Math.round(event.data.width * ratio),
            Math.round(event.data.height * ratio),
            decorationImageUrl,
            ctx);
        }
        // function drawImageOnUI() will invoke function draw().
        //ctx.draw();
      });
    });
    // start
    _that.startTacking();
  },
  stopTacking() {
    clearInterval(intervalId);
    if (listener) {
      listener.stop();
    }
  },
   /* 20.619.8 Because function "wx.canvasToTempFilePath()" will cause a crash problem on Android Wechat, this code will not be executed temporarily.
  compressPhoto(resData,
    imageWidth,
    imageHeight,
    frameWidth,
    frameHeight,
    callback) {
    var _that = this;
    // image position
    const imageX = 0;
    const imageY = 0;
    const ctx = hiddenCanvasContext;
    wx.canvasPutImageData({
      canvasId: hiddenCanvasId,
      x: imageX,
      y: imageY,
      width: imageWidth,
      height: imageHeight,
      data: resData,
      success(res) {
        wx.canvasToTempFilePath({
          x: imageX,
          y: imageY,
          width: imageWidth,
          height: imageHeight,
          destWidth: frameWidth,
          destHeight: frameHeight,
          canvasId: hiddenCanvasId,
          success(res) {
            if (typeof callback === 'function') {
              callback(res.tempFilePath);
            }
          }
        });
      },
      fail(error) {
        console.log('canvasPutImageData', error);
      }
    });
  },
  */
  processPhoto(resData, imageWidth, imageHeight) {
    /* 2019.8.6 Because there is a crash problem on Android Wechat, this code will not be executed temporarily.
        var _that = this;
        const ctx = hiddenCanvasContext;
        // image position
        const imageX = 0;
        const imageY = 0;
        // size ratio
        frameHeight = (imageHeight / imageWidth) * frameWidth;
        // option: compress image
        _that.compressPhoto(resData,
          imageWidth,
          imageHeight,
          frameWidth,
          frameHeight,
          function (photoPath) {
            // draw image on hidden canvas
            ctx.drawImage(photoPath, imageX, imageY, frameWidth, frameHeight);
            // waiting for drawing
            ctx.draw(false, function () {
              // get image data from hidden canvas
              wx.canvasGetImageData({
                canvasId: hiddenCanvasId,
                x: imageX,
                y: imageY,
                width: frameWidth,
                height: frameHeight,
                success(res) {
                  // start
                  var startDate = new Date();
                  // process image
                  tracker.track(res.data, frameWidth, frameHeight);
                  // end
                  var endDate = new Date();
                  console.log('cost time:', endDate - startDate, 'ms');
                }
              });
            });
          });
    */
    // We can process images directly, but it will become slow.
    // 2019.8.6 Because origin image is not compressed, frameWidth is equal to imageWidth. 
    // size ratio
    frameWidth = imageWidth;
    frameHeight = imageHeight;
    // start
    var startDate = new Date();
    // process image directly
    tracker.track(resData, imageWidth, imageHeight);
    // end
    var endDate = new Date();
    console.log('cost time:', endDate - startDate, 'ms');
  },
  startTacking() {
    var _that = this;
    var resData = null;
    var resWidth = 0;
    var resHeight = 0;
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
      console.log('frame:', res.width, res.height);
      resData = new Uint8ClampedArray(res.data);
      resWidth = res.width;
      resHeight = res.height;
    });
    // start
    listener.start();
    console.log('startTacking', 'listener is start');

    // process
    intervalId = setInterval(function () {
      if (!resData) {
        return;
      }
      // canvas Height
      if (canvasHeight === 0) {
        canvasHeight = Math.round(canvasWidth * (resHeight / resWidth));
        return;
      }
      _that.processPhoto(resData, resWidth, resHeight);
    }, intervalTime);

  },
  initTracking(type) {
    if (type === 'colorTracker') {
      this.drawByColorTracker();
    }
    else if (type === 'faceTracker') {
      this.drawByFaceTracker();
    }
    else if (type === 'imageTracker') {
      this.drawByImageTracker();
    }
    else if (type === 'objectTracker') {
      this.drawByObjectTracker();
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
