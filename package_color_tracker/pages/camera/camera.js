const image = require('../../utils/imageBusiness.js')
const canvasId = 'canvasMask';
const canvasWidth = 375;
var canvasHeight = 500;

Page({
    // throttling for Android
    intervalTimeout: 100,
    intervalId: null,
    // a camera listener
    listener: null,
    data: {
        devicePosition: 'back',
        notice: '',
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
        canvasMaskStyle:"",
    },
    onReady() {

    },
    onLoad() {
        var _that = this;
        // waiting for dom completed
        setTimeout(function () {
            _that.getCanvasOfType2d();
        }, 150);
        const system = wx.getSystemInfoSync().system;
        // if iOS
        if (system.indexOf('iOS') !== -1) {
            // throttling for iOS
            this.intervalTimeout = 100;
            canvasHeight = 450;
            this.setData({
                canvasMaskStyle:"height: 450px;",
            });
        }
    },
    onUnload: function () {
        this.stopTacking();
        console.log('onUnload', 'the listener is stopped.');
    },
    onCameraFrame_callback(resData,
        frameWidth,
        frameHeight) {
        // var _that = this;
        // process start
        image.detect(resData,
            frameWidth,
            frameHeight,
            canvasWidth,
            canvasHeight
            );
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
    startTacking() {
        var _that = this;
        const context = wx.createCameraContext();

        // real-time
        var frameData;
        var frameWidth;
        var frameHeight;
        this.listener = context.onCameraFrame(function (res) {
            frameData = new Uint8ClampedArray(res.data);
            frameWidth = res.width;
            frameHeight = res.height;
            console.log('onCameraFrame:', res.width, res.height);
        });

        this.intervalId = setInterval(function () {
            if (frameData) {
                _that.onCameraFrame_callback(frameData,
                    frameWidth,
                    frameHeight);
            }
        }, this.intervalTimeout);

        // start
        this.listener.start();
        console.log('startTacking', 'the listener is running');
    },
    stopTacking() {
        if (this.listener) {
            this.listener.stop();
            this.listener = null;
        }
        clearInterval(this.intervalId);
    },
    takePhoto() {
        var _that = this;
        if (_that.data.isButtonDisabled) {
            return
        }
        _that.setData({
            isButtonDisabled: true,
        });

        image.initTracker(_that.canvasContext,
            _that.data.customColor,
            _that.data.colorRange,
            _that.data.colorArray);

        // the camera listener is going to start to track
        _that.startTacking();
    },
    showPermission() {
        wx.showModal({
            title: '请打开摄像头权限',
            content: '用于检测摄像头画面中的照片。点击"确定"去设置。点击"取消"返回。',
            success(res) {
                if (res.confirm) {
                    wx.openSetting({
                        success(res) {
                            console.log('showPermission', res.authSetting);
                        }
                    });
                } else if (res.cancel) {
                    wx.navigateBack();
                }
            }
        });
    },
    camera_error(e) {
        console.log('camera_error', e.detail);
        this.showPermission();
    }
});
