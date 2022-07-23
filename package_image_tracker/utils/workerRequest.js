var worker;
var detect_callback;
var initTracker_callback;
var canUse_callback;
var initTracker_start_time;
var detect_start_time;

function createNewWorker() {
    // 文件名指定 worker 的入口文件路径，绝对路径
    worker = wx.createWorker('workers/workerResponse.js', {
        // 在iOS下的实验worker
        useExperimentalWorker: true,
    })
    // 监听worker被系统回收事件
    worker.onProcessKilled(() => {
        // 重新创建一个worker
        createNewWorker()
    })
}

// 创建实验worker
createNewWorker()

// 接收消息
worker.onMessage(function (res) {
    if (res.method === 'detect_callback') {
        console.log('detect_callback:', new Date() - detect_start_time, 'ms');

        if (detect_callback) {
            detect_callback(res.params)
        }
    }
    else if (res.method === 'initTracker_callback') {
        console.log('initTracker_callback:', new Date() - initTracker_start_time, 'ms');

        if (initTracker_callback) {
            initTracker_callback(res.params)
        }
    }
    else if (res.method === 'canUse_callback') {
        console.log('canUse_callback');

        if (canUse_callback) {
            canUse_callback(res.params)
        }
    }
    else {
        console.log('main Worker onMessage', res)
    }
})

// 发送消息
function initTracker(patternImageArray, callback) {
    initTracker_start_time = new Date()
    initTracker_callback = callback

    // 发送消息
    worker.postMessage({
        method: 'initTracker',
        params: {
            patternImageArray,
        }
    })

}

function detect(type, frameData, width, height, callback) {
    detect_start_time = new Date()
    detect_callback = callback

    // 发送消息
    worker.postMessage({
        method: 'detect',
        params: {
            type,
            frameData,
            width,
            height,
        }
    })
}

function getWorker() {
    return worker
}

function canUse(functionName, callback) {
    canUse_callback = callback

    worker.postMessage({
        method: 'canUse',
        params: {
            functionName,
        }
    })
}

function dispose() {
    if (!worker) {
        return
    }
    // 结束当前 Worker 线程
    worker.terminate()
}

module.exports = {
    initTracker,
    detect,
    getWorker,
    canUse,
    dispose,
}