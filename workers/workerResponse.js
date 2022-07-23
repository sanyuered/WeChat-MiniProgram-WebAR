// Worker内代码只能require目录Worker中的文件
// Worker目录内只支持放置JS文件，其他类型的静态文件需要放在Worker目录外
const imageBusiness = require('imageBusiness.js');

// 在 Worker 线程执行上下文会全局暴露一个 worker 对象，直接调用 worker.onMessage/postMessage 即可
worker.onMessage(async function (res) {
    if (res.method === 'detect') {
        const result = imageBusiness.detect(res.params)

        // 向主线程发消息
        worker.postMessage({
            method: 'detect_callback',
            params: result,
        })
    }
    else if (res.method === 'initTracker') {
        await imageBusiness.initTracker(res.params)

        // 向主线程发消息
        worker.postMessage({
            method: 'initTracker_callback',
            params: { msg: 'ok' },
        })
    }
    else if (res.method === 'canUse') {
        var msg = ''
        if (worker[res.params.functionName]) {
            msg = 'ok'
        }

        // 向主线程发消息
        worker.postMessage({
            method: 'canUse_callback',
            params: { msg },
        })
    }
    else {
        console.log('client Worker onMessage', res)
    }
})
