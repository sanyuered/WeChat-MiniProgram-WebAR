const image = require('../../utils/imageBusiness.js')
// a video
const videoMaskId = "videoMask";
// mask image
const trackPoint = {
    x: 187, // the width of the pattern image is 375
    y: 187, // the height of the pattern image is 375
};

Page({
    videoContext: null,
    // throttling for Android
    intervalTimeout: 300,
    intervalId: null,
    // a camera listener
    listener: null,
    data: {
        devicePosition: 'back',
        notice: '',
        // patternImageUrl: 'face_pattern.jpg',
        videoUrl: 'https://sanyuered.github.io/imgs/sample.mp4',
        videoTransform: '',
        patternImageUrl: '/assets/face_pattern.jpg',
        isButtonDisabled: false,
        isVideoVisible: false,
        animationData: null,
    },
    async onReady() {
        const system = wx.getSystemInfoSync().system;
        // if iOS
        if (system.indexOf('iOS') !== -1) {
            // throttling for iOS
            this.intervalTimeout = 3000;
        }
        var _that = this;
        await image.initTracker();

        _that.videoContext = wx.createVideoContext(videoMaskId)
        // the camera listener is going to start to track
        _that.startTacking();
    },
    onUnload() {
        this.stopTacking();
        console.log('onUnload', 'the listener is stopped.');
    },
    onCameraFrame_callback(resData,
        canvasWidth,
        canvasHeight) {
        var _that = this;
        // process start
        image.detect(resData,
            canvasWidth,
            canvasHeight,
            function (event) {
                var result = event.data;
                if (result && result.prediction) {
                    // set the position
                    image.updateMaskVideoPosition(result.prediction,
                        _that,
                        trackPoint,
                        canvasWidth,
                        canvasHeight)
                    var message = "detect: " + result.prediction.goodMatch + " points, " + result.end + ' ms.';
                    _that.setData({ notice: message });
                } else {
                    // set the default position
                    image.setMaskVideoDefaultPosition(_that);
                    var message = 'No results.';
                    _that.setData({ notice: message });
                    console.log('detect:', message);
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
        console.log('startTacking', 'the listener is running');
    },
    stopTacking() {
        if (this.listener) {
            this.listener.stop();
            this.listener = null;
        }
        clearInterval(this.intervalId);
    },
    playMaskVideo() {
        this.videoContext.play();
    },
    takePhoto() {
        var _that = this;
        if (_that.data.isButtonDisabled) {
            return
        }
        _that.setData({
            isButtonDisabled: true,
            isVideoVisible: true,
        });
        _that.playMaskVideo();
    },
    error(e) {
        console.log(e.detail);
    }
})
