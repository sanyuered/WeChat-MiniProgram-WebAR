

const ImageTracker = require('ImageTracker.js');

const hiddenCanvasId = 'hiddenCanvas';
// pattern image resample levels

const resampleLevels = 4;

// pattern image url: relative url,temp url and network url.

const patternImageUrl = './face_pattern.jpg';
// pattern image width
var patternFrameWidth;

// pattern image height
var patternFrameHeight;

// pattern image max width

const patternFrameMaxWidth = 375;
// image tracker.

var tracker = null;
// temp pattern Image Path

var tempPatternImagePath = null;
// pattern Image Array

var patternImageArray = [];
// magic number

const sc_inc = Math.sqrt(2.0);

function detect(frame, width, height, callback) {
  if (!tracker) {
    console.log('detect:', 'waiting for the tracker initing to complete.');
    return;
  }

  var result = tracker.track(frame, width, height);

  if (callback) {
    callback(result);
  }
}

async function drawPatternImageCallback(ctx) {
  var imageX = 0;
  var newWidth = patternFrameWidth;
  var newHeight = patternFrameHeight;

  for (var i = 0; i < resampleLevels; i++) {
    let canvasRes = ctx.getImageData(
      imageX,
      0,
      newWidth,
      newHeight);

    console.log('resample pattern image', canvasRes.width, canvasRes.height);
    patternImageArray.push({
      pixels: canvasRes.data,
      width: canvasRes.width,
      height: canvasRes.height
    }); // resample

    imageX += newWidth;
    newWidth = Math.round(newWidth / sc_inc);
    newHeight = Math.round(newHeight / sc_inc);
  } // init ImageTracker


  tracker = new ImageTracker(patternImageArray);
} // get patter image


function initTracker() {
  wx.createSelectorQuery()
    .select('#' + hiddenCanvasId)
    .fields({ node: true, size: true })
    .exec((res) => {
      const canvas2d = res[0].node;
      let ctx = canvas2d.getContext("2d");

      // needs to set the canvas size
      canvas2d.width = res[0].width;
      canvas2d.height = res[0].height;

      createImage(canvas2d,
        patternImageUrl,
        function (image) {
          getCanvasContext(image, ctx)
        })
    });
}

function createImage(canvasDom, imgUrl, callback) {
  const image = canvasDom.createImage();
  image.onload = () => {
    callback(image);
  };
  image.onerror = (err) => {
    console.log("imageBusiness.js createImage", err);
  };
  image.src = imgUrl;
}

async function getCanvasContext(image, ctx) {
  patternImageArray = [];

  // pattern image temp path
  // tempPatternImagePath = res.path; // pattern image size

  patternFrameWidth = image.width;
  patternFrameHeight = image.height; // reduce image size to increase image process speed

  if (patternFrameWidth > patternFrameMaxWidth) {
    patternFrameWidth = patternFrameMaxWidth;
    patternFrameHeight = res.height / res.width * patternFrameMaxWidth;
  } // resample width and height

  var newWidth = patternFrameWidth;
  var newHeight = patternFrameHeight;
  var imageX = 0;

  for (var i = 0; i < resampleLevels; i++) {
    // draw image on canvas
    // ctx.drawImage(tempPatternImagePath, imageX, 0, newWidth, newHeight); // resample
    ctx.drawImage(image, imageX, 0, newWidth, newHeight); // resample

    imageX += newWidth;
    newWidth = Math.round(newWidth / sc_inc);
    newHeight = Math.round(newHeight / sc_inc);
  }

  drawPatternImageCallback(ctx);
}

module.exports = {
  initTracker,
  detect,
};