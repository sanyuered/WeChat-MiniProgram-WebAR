// wasm路径
global.wasm_url = '/package_opencv_tracker/assets/opencv3.4.16.wasm.br'
// opencv_exec.js会从global.wasm_url获取wasm路径
let cv = require('../assets/opencv_exec.js');
// 有效的特征点数目
const ValidPointTotal = 15
// 识别图的特征点
var template_keypoints_vector;
// 识别图的特征点的描述因子
var template_descriptors;
// 单应性矩阵
var homography_transform;
// 查看opencv.js包含的方法
console.log('cv', cv)

// 识别图
function initTemplateImage(templateImageData) {
    var src = cv.imread(templateImageData);
    // 灰度化
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    // 特征点
    template_keypoints_vector = new cv.KeyPointVector();
    // 描述因子
    template_descriptors = new cv.Mat();
    // 占位置的输入参数
    var noArray = new cv.Mat();
    // ORB特征点检测
    var orb = new cv.ORB();
    // 检测特征点
    orb.detectAndCompute(src, noArray, template_keypoints_vector, template_descriptors)
    // 回收对象
    src.delete()
    noArray.delete()
    orb.delete()
}

// 相机图像
function detectAndCompute(keyFrameImageData) {
    // 读取图片
    var src = cv.imread(keyFrameImageData);
    // 灰度化
    cv.cvtColor(src, src, cv.COLOR_RGBA2GRAY, 0);
    // 特征点
    var frame_keypoints_vector = new cv.KeyPointVector();
    // 描述因子
    var frame_descriptors = new cv.Mat();
    // ORB特征点检测
    var orb = new cv.ORB();
    // 占位置的输入参数
    var noArray = new cv.Mat();
    // 检测特征点
    orb.detectAndCompute(src, noArray, frame_keypoints_vector, frame_descriptors)
    var knnMatches = new cv.DMatchVectorVector();
    // 特征点匹配
    var matcher = new cv.BFMatcher();
    matcher.knnMatch(frame_descriptors, template_descriptors, knnMatches, 2)
    // 相机图像的特征点
    var frame_keypoints = [];
    // 识别图的特征点
    var template_keypoints = [];

    // 保存特征点匹配的结果
    for (var i = 0; i < knnMatches.size(); i++) {
        var point = knnMatches.get(i).get(0)
        var point2 = knnMatches.get(i).get(1)

        if (point.distance < 0.7 * point2.distance) {
            // 相机图像
            var frame_point = frame_keypoints_vector.get(point.queryIdx).pt
            frame_keypoints.push(frame_point)
            // 识别图
            var template_point = template_keypoints_vector.get(point.trainIdx).pt
            template_keypoints.push(template_point)
        }
       
    }

    // 将js数组转换为cv.Mat对象
    var frameMat = new cv.Mat(frame_keypoints.length, 1, cv.CV_32FC2);
    var templateMat = new cv.Mat(template_keypoints.length, 1, cv.CV_32FC2);

    for (let i = 0; i < template_keypoints.length; i++) {
        // 相机图像
        frameMat.data32F[i * 2] = frame_keypoints[i].x;
        frameMat.data32F[i * 2 + 1] = frame_keypoints[i].y;
        // 识别图
        templateMat.data32F[i * 2] = template_keypoints[i].x;
        templateMat.data32F[i * 2 + 1] = template_keypoints[i].y;
    }
    // 如果有15个有效的点
    if (template_keypoints.length >= ValidPointTotal) {
        var homography = cv.findHomography(templateMat, frameMat, cv.RANSAC)
        homography_transform = homography.data64F
    }else{
        homography_transform = null
    }

    // 回收对象   
    noArray.delete()
    orb.delete()
    frame_keypoints_vector.delete()
    frame_descriptors.delete()
    knnMatches.delete()
    matcher.delete()
    templateMat.delete()
    frameMat.delete()
    src.delete()
    frame_keypoints = null
    template_keypoints = null

    return {
        prediction: homography_transform,
    }
}


// 检测
function detect(imageData) {
    var result;
    var startTime = new Date();
    
    result = detectAndCompute(imageData)
    console.log('detectAndCompute:', new Date() - startTime, 'ms');

    return result
}

function dispose() {
    // 是否有效
    isValidKeyFrame = false;
    // 识别图的特征点
    if (template_keypoints_vector) {
        template_keypoints_vector.delete()
        template_keypoints_vector = null
    }
    // 识别图的特征点的描述因子
    if (template_descriptors) {
        template_descriptors.delete()
        template_descriptors = null
    }
    // 单应性矩阵
    homography_transform = null
    // 有特征点的图像
    var lastFrame;
    if (lastFrame) {
        lastFrame.delete()
        lastFrame = null
    }
    // 有效的特征点
    var lastFrameMat
    if (lastFrameMat) {
        lastFrameMat.delete()
        lastFrameMat = null
    }
}

module.exports = {
    initTemplateImage,
    detect,
    dispose,
}