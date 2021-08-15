const image = require('../../utils/imageBusiness.js');
const model = require('../../utils/modelBusiness.js');
const canvasWebGLId = 'canvasWebGL';
// throttling for Android
var cameraFrameMax = 20;
// a url of sprite image
const modelUrl = '../../utils/cat_beard.png';

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
        const system = wx.getSystemInfoSync().system;
        // if iOS
        if (system.indexOf('iOS') !== -1) {
            // throttling for iOS
            cameraFrameMax = 4000;
        }
    },
    onLoad() {
        var _that = this;
        // waiting for dom completed
        setTimeout(function () {
            // load 3d model
            model.initThree(canvasWebGLId, modelUrl);
            image.initTracker();
            // the camera listener is going to start to track
            _that.startTacking();
        }, 150);
    },
    onUnload: function () {
        this.stopTacking();
        console.log('onUnload', 'the listener is stopped.');

        model.stopAnimate();
        model.dispose();
    },
    onCameraFrame_callback(resData,
        canvasWidth,
        canvasHeight) {
 // process start
 image.detect(resData,
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
            frameData = new Uint8ClampedArray(res.data);
            canvasWidth = res.width;
            canvasHeight = res.height;
            console.log('onCameraFrame:', res.width, res.height);
        });

        this.intervalId = setInterval(function () {
            if (frameData) {
                _that.onCameraFrame_callback(frameData,
                    canvasWidth,
                    canvasHeight);
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
