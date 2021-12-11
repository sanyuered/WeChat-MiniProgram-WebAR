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
    // throttling for Android
    intervalTimeout: 200,
    intervalId: null,
    // a camera listener
    listener: null,
    data: {
        devicePosition: 'back',
    },
    onReady() {
        var _that = this;
        const system = wx.getSystemInfoSync().system;
        // if iOS
        if (system.indexOf('iOS') !== -1) {
            // throttling for iOS
            this.intervalTimeout = 1000;
        }
        // load 3d model
        model.initThree(canvasWebGLId, modelUrl);

        setTimeout(async function () {
            // 识别图
            const patternImageData = await _that.createImageElement(patternImage)
            imageTracker.initTemplateImage(patternImageData)
            _that.startTacking();
        }, 1000)
    },
    onUnload() {
        this.stopTacking();
        console.log('onUnload', 'the listener is stopped.');

        model.stopAnimate();
        model.dispose();
        imageTracker.dispose()
    },
    // 获取图像数据和调整图像大小
    getImageData(image, offscreenCanvas) {
        var _that = this
        // const ctx = wx.createCanvasContext(canvasId);
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
    onCameraFrame_callback(frame) {
        // process start
        var result = imageTracker.detect(frame)

        if (result && result.prediction) {
            // set the rotation and position of the 3d model.    
            model.setModel(result.prediction,
                canvasWidth,
                canvasHeight);
            // show a image in the three.js   
            var imageData = {
                data: new Uint8Array(frame.data),
                width: frame.width,
                height: frame.height,
            };
            // put the 3d model on the image
            model.setSceneBackground(imageData);
        } else {
            var message = 'No results.';
            wx.showToast({
                title: message,
                icon: 'none'
            });

            // clear 3d canvas
            model.clearSceneBackground();
        }

        // process end
    },
    startTacking() {
        var _that = this;
        const context = wx.createCameraContext();

        // real-time
        var frame={};
        this.listener = context.onCameraFrame(function (res) {
            frame.data = new Uint8ClampedArray(res.data);
            frame.width=res.width;
            frame.height=res.height;

            canvasWidth = res.width;
            canvasHeight = res.height;
            console.log('onCameraFrame:', res.width, res.height);
        });

        this.intervalId = setInterval(function () {
            if (frame) {
                _that.onCameraFrame_callback(frame);
            }
        }, this.intervalTimeout);

        // start
        this.listener.start();
        console.log('startTacking', 'listener is running');
    },
    stopTacking() {
        if (this.listener) {
            this.listener.stop();
            this.listener = null;
        }
        clearInterval(this.intervalId);
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
    }
})
