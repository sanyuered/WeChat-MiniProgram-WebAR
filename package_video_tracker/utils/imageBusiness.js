
const ImageTracker = require('ImageTracker.js');

// pattern image resample levels
const resampleLevels = 4;

// pattern image url: relative url,temp url and network url.
const patternImageUrl = '/assets/face_pattern.jpg';

// pattern image max width
const maxCanvasWidth = 375;

// image tracker.
var tracker = null;

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

// 获取图像数据和调整图像大小
function getSampleData(image, offscreenCanvas) {
  var imageX = 0;
  var newWidth = image.width;
  var newHeight = image.height;
  var patternImageArray = [];

  canvasWidth = image.width;
  if (canvasWidth > maxCanvasWidth) {
    canvasWidth = maxCanvasWidth;
  }
  // canvas Height
  canvasHeight = Math.floor(canvasWidth * (image.height / image.width));
  // 离屏画布的宽度和高度不能小于采样图像的
  offscreenCanvas.width = canvasWidth * resampleLevels;
  offscreenCanvas.height = canvasHeight;

  // draw image on canvas
  var ctx = offscreenCanvas.getContext('2d')
  // resample
  for (var i = 0; i < resampleLevels; i++) {
    // draw image on canvas
    ctx.drawImage(image, imageX, 0, newWidth, newHeight); // resample

    // get image data 
    let canvasRes = ctx.getImageData(
      imageX,
      0,
      newWidth,
      newHeight);

    patternImageArray.push({
      pixels: canvasRes.data,
      width: canvasRes.width,
      height: canvasRes.height
    });
    console.log('resample pattern image', canvasRes.width, canvasRes.height);
  
    imageX += newWidth;
    newWidth = Math.round(newWidth / sc_inc);
    newHeight = Math.round(newHeight / sc_inc);
  }

  return patternImageArray

}

// 创建图像对象
async function createImageElement(imgUrl) {
  // 创建2d类型的离屏画布（需要微信基础库2.16.1以上）
  var offscreenCanvas = wx.createOffscreenCanvas({ type: '2d' });
  const image = offscreenCanvas.createImage();
  await new Promise(function (resolve, reject) {
    image.onload = resolve
    image.onerror = reject
    image.src = imgUrl
  })
  const sampleData = getSampleData(image, offscreenCanvas)
  return sampleData
}

async function initTracker() {
  const patternImageArray = await createImageElement(patternImageUrl)
  // init ImageTracker
  tracker = new ImageTracker(patternImageArray);
}

function getTranslation(td, x, y) {
  var m00 = td[0], m01 = td[1], m02 = td[2],
      m10 = td[3], m11 = td[4], m12 = td[5],
      m20 = td[6], m21 = td[7], m22 = td[8];
  var x2 = m00 * x + m01 * y + m02;
  var y2 = m10 * x + m11 * y + m12;
  var ws = m20 * x + m21 * y + m22;
  var sc = 1.0 / ws;
  var _x = x2 * sc;
  var _y = y2 * sc;

  // console.log('translation', _x, _y);
  return { _x, _y };
}

function updateMaskVideoPosition(prediction,
  page,
  trackPoint,
  canvasWidth,
  canvasHeight) {
  console.log('prediction', prediction)
  var t = prediction.transform.data;
  var target = getTranslation(t, trackPoint.x, trackPoint.y)
  var x = target._x - canvasWidth / 2;
  var y = target._y - canvasHeight / 2;
  // convert 3x3 to 4x4
  var t_array = [t[0], t[3], 0, t[6],
  t[1], t[4], 0, t[7],
      0, 0, 1, 0,
      x, y, 0, t[8]];

  var t_matrix = 'transform:matrix3d(' + t_array.join(',') + ')';
  page.setData({
    videoTransform : t_matrix,
  });
}

function setMaskVideoDefaultPosition(page) {
  var t_matrix = 'transform:matrix3d(0.65, 0, 0, 0,  0, 0.65, 0, 0,  0, 0, 1, 0,  0, 0, 0, 1)';
  page.setData({
    videoTransform : t_matrix,
  });
}

module.exports = {
  initTracker,
  detect,
  updateMaskVideoPosition,
  setMaskVideoDefaultPosition,
  getTranslation,
};