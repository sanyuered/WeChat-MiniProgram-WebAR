const ImageTracker = require('ImageTracker.js');
// image tracker.
var tracker = null;
// pattern image resample levels
const resampleLevels = 4;
// pattern image url: relative url,temp url and network url.
const patternImageUrl = '/assets/face_pattern.jpg';
// max Canvas Width
const maxCanvasWidth = 375;
// magic number
const sc_inc = Math.sqrt(2.0);

// 获取相机图像数据
function getImageData(image, offscreenCanvas) {
  var _that = this
  var canvasWidth = image.width;
  if (canvasWidth > maxCanvasWidth) {
    canvasWidth = maxCanvasWidth;
  }
  // canvas Height
  var canvasHeight = Math.floor(canvasWidth * (image.height / image.width));
  // 离屏画布的宽度和高度不能小于图像的
  offscreenCanvas.width = canvasWidth;
  offscreenCanvas.height = canvasHeight;
  // draw image on canvas
  var ctx = offscreenCanvas.getContext('2d')
  ctx.drawImage(image, 0, 0, canvasWidth, canvasHeight);
  // get image data from canvas
  var imgData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);

  return imgData
}

// 获取识别图像数据
function getSampleData(image, offscreenCanvas) {
  var imageX = 0;
  var newWidth = image.width;
  var newHeight = image.height;
  var patternImageArray = [];

  var canvasWidth = image.width;
  if (canvasWidth > maxCanvasWidth) {
    canvasWidth = maxCanvasWidth;
  }
  // canvas Height
  var canvasHeight = Math.floor(canvasWidth * (image.height / image.width));
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

// 使用离屏画布，创建图像对象
async function createImageElement(imgUrl) {
  // 创建2d类型的离屏画布（需要微信基础库2.16.1以上）
  var offscreenCanvas = wx.createOffscreenCanvas({ type: '2d' });
  const image = offscreenCanvas.createImage();
  await new Promise(function (resolve, reject) {
    image.onload = resolve
    image.onerror = reject
    image.src = imgUrl
  })

  return { image, offscreenCanvas }
}


async function getPatternData() {
  const imageEl = await createImageElement(patternImageUrl)
  const patternImageArray = getSampleData(imageEl.image, imageEl.offscreenCanvas)
  return patternImageArray
}

async function getPhotoData(imgUrl) {
  const imageEl = await createImageElement(imgUrl)
  const photoData = getImageData(imageEl.image, imageEl.offscreenCanvas)
  return photoData
}

async function initTracker(params) {
  // init ImageTracker
  tracker = new ImageTracker(params.patternImageArray);
}

function detect(params) {
  if (!tracker) {
    console.log('detect:', 'waiting for the tracker initing to complete.');
    return;
  }

  var result

  // 新版基础库的iOS的worker线程
  // 变量worker在worker线程中是全局变量
  if (params.type === 'camera' && worker && worker.getCameraFrameData) {
    const cameraFrameData = worker.getCameraFrameData()
    const frame = new Uint8ClampedArray(cameraFrameData);
    result = tracker.track(frame, params.width, params.height);
  } else {
    // android、旧版基础库的iOS、微信开发者工具等环境
    result = tracker.track(params.frameData, params.width, params.height);
  }

  if(params.callback){
    params.callback(result)
  }
  
  return result
}

module.exports = {
  getPatternData,
  getPhotoData,
  initTracker,
  detect,
};