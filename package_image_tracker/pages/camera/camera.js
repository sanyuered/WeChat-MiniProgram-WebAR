const workerRequest = require('../../utils/workerRequest.js');
const imageBusiness = require('../../utils/imageBusiness.js');
const model = require('../../utils/modelBusiness.js');
const canvasWebGLId = 'canvasWebGL';
// a url of sprite image
const modelUrl = '/assets/cat_beard.png';

Page({
    // throttling for Android and iOS
    intervalTimeout: 500,
    intervalId: null,
    // a camera listener
    listener: null,
    // worker线程的方法是否可用
    canUseGetCameraFrameData: false,
    data: {
        devicePosition: 'back',
        patternImageUrl: '/assets/face_pattern.jpg',
    },
    async onReady() {
        var _that = this;
        // load 3d model
        model.initThree(canvasWebGLId, modelUrl);
        const patternImageArray = await imageBusiness.getPatternData()
        // 初始化识别图片
        workerRequest.initTracker(patternImageArray, function () {
            // 检查worker线程是否有getCameraFrameData()方法
            workerRequest.canUse('getCameraFrameData', function (res) {
                if (res.msg === 'ok') {
                    _that.canUseGetCameraFrameData = true
                }
                // the camera listener is going to start to track
                _that.startTacking();
            })
        });
    },
    onUnload() {
        this.stopTacking();
        console.log('onUnload', 'the listener is stopped.');

        model.stopAnimate();
        model.dispose();
    },
    onCameraFrame_callback(
        frameData,
        canvasWidth,
        canvasHeight) {
        // process start
        workerRequest.detect('camera',
            frameData,
            canvasWidth,
            canvasHeight,
            function (event) {
                var result = event.data;
                if (result && result.prediction) {
                    // set the rotation and position of the 3d model.    
                    model.setModel(result.prediction,
                        canvasWidth,
                        canvasHeight);
                } else {
                    var message = 'No results.';
                    wx.showToast({
                        title: message,
                        icon: 'none'
                    });
                }
            });
        // process end
    },
    startTacking() {
        var _that = this;
        const context = wx.createCameraContext();

        // real-time
        var frameData;
        var canvasWidth;
        var canvasHeight;
        this.listener = context.onCameraFrame(function (res) {
            // 在iOS新版worker线程中，获取相机图像。
            if (_that.canUseGetCameraFrameData) {
                frameData = []
            } else {
                // android、旧版基础库的iOS、微信开发者工具等环境
                frameData = new Uint8ClampedArray(res.data);
            }
            canvasWidth = res.width;
            canvasHeight = res.height;
        });

        this.intervalId = setInterval(function () {
            if (canvasWidth) {
                console.log('Camera Frame', canvasWidth, canvasHeight);
                _that.onCameraFrame_callback(
                    frameData,
                    canvasWidth,
                    canvasHeight);
            }
        }, this.intervalTimeout);

        // start
        this.listener.start({
            // 仅在iOS上可用
            worker: workerRequest.getWorker(),
        });
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
