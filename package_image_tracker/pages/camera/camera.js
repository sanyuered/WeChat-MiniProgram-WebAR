const image = require('../../utils/imageBusiness.js')
const model = require('../../utils/cameraModelBusiness.js');
const canvasWebGLId = 'canvasWebGL';
// throttling for Android
var cameraFrameMax = 20;
// set a url of a gltf model 
const modelUrl = 'https://m.sanyue.red/demo/gltf/sunglass.glb';
// a camera listener
var listener = null;

Page({
    data: {
        devicePosition: 'back',
    },
    onReady() {
        const system = wx.getSystemInfoSync().system;
        // if iOS
        if (system.indexOf('iOS') !== -1) {
            // throttling for iOS
            cameraFrameMax = 125;
            var message = 'Slow on iOS.';
            wx.showToast({
                title: message,
                icon: 'none'
            });
        }
    },
    async onLoad() {
        var _that = this;
        // load 3d model
        model.initThree(canvasWebGLId, modelUrl);
        await image.initTracker();
        // the camera listener is going to start to track
        _that.startTacking();
    },
    onUnload: function () {
        this.stopTacking();
        console.log('onUnload', 'the listener is stopped.');

        model.stopAnimate();
        model.dispose();
    },
    startTacking() {
        var _that = this;
        var count = 0;
        const context = wx.createCameraContext();

        // real-time
        listener = context.onCameraFrame(async function (res) {
            // this is throttling
            if (count < cameraFrameMax) {
                count++;
                return;
            }
            count = 0;
            console.log('onCameraFrame:', res.width, res.height);
            var resData = new Uint8ClampedArray(res.data);
            var canvasWidth = res.width;
            var canvasHeight = res.height;

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

        });
        // start
        listener.start();
        console.log('startTacking', 'listener is running');
    },
    stopTacking() {
        if (listener) {
            listener.stop();
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
    }
})
