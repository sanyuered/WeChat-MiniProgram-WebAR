const { createScopedThreejs } = require('threejs-miniprogram');
// the scale of the model image
const initScale = 300;
// index of the track points of the face
const trackPointA = {
    // index of a landmark
    id: 27,
    // X coordinate
    x: 155.69898111309, // the width of the face image is 375
};
const trackPointB = {
    // index of a landmark
    id: 29,
    // X coordinate
    x: 216.53075265284997, // the width of the face image is 375
};

var camera, scene, renderer;
var canvas;
var THREE;
var mainModel, requestId;
var canvasWidth, canvasHeight;

function initThree(canvasId, modelUrl) {
    wx.createSelectorQuery()
        .select('#' + canvasId)
        .node()
        .exec((res) => {
            canvas = res[0].node;
            THREE = createScopedThreejs(canvas);

            initScene();
            loadModel(modelUrl);
        });
}

function initScene() {
    camera = new THREE.OrthographicCamera(1, 1, 1, 1, -1000, 1000);
    // set the camera
    setSize();
    scene = new THREE.Scene();
    // ambient light
    scene.add(new THREE.AmbientLight(0xffffff));
    // direction light
    var directionallight = new THREE.DirectionalLight(0xffffff, 1);
    directionallight.position.set(0, 0, 1000);
    scene.add(directionallight);

    // init render
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
    });
    const devicePixelRatio = wx.getSystemInfoSync().pixelRatio;
    console.log('device pixel ratio', devicePixelRatio);
    renderer.setPixelRatio(devicePixelRatio);
    renderer.setSize(canvas.width, canvas.height);

    animate();
}

function loadModel(modelUrl) {
    wx.showLoading({
        title: 'Loading Sprite...',
    });
    const sprite_map = new THREE.TextureLoader().load(modelUrl);
    const sprite_material = new THREE.SpriteMaterial({ map: sprite_map });
    var sprite = new THREE.Sprite(sprite_material);
    sprite.scale.setScalar(initScale);
    mainModel = sprite;
    scene.add(mainModel);
    wx.hideLoading();
    console.log('loadModel', 'success');
}

function updateModel(modelUrl) {
    // loading
    wx.showLoading({
        title: 'Loading Sprite...',
    });
    // sprite
    const sprite_map = new THREE.TextureLoader().load(modelUrl);
    const sprite_material = new THREE.SpriteMaterial({ map: sprite_map });
    var sprite = new THREE.Sprite(sprite_material);
    sprite.scale.setScalar(initScale);
    // remove old model
    scene.remove(mainModel);
    // save new model
    mainModel = sprite;
    // add new model
    scene.add(mainModel);
    wx.hideLoading();
    console.log('updateModel', 'success');
}

function setSize() {
    const w = canvasWidth;
    const h = canvasHeight;
    camera.left = -0.5 * w;
    camera.right = 0.5 * w;
    camera.top = 0.5 * h;
    camera.bottom = -0.5 * h;
    camera.updateProjectionMatrix();
}

function setModel(prediction,
    _canvasWidth,
    _canvasHeight) {

    if (_canvasWidth !== canvasWidth) {
        canvasWidth = _canvasWidth;
        canvasHeight = _canvasHeight;
        setSize();
    }
    if (!mainModel) {
        console.log('setModel', '3d model is not loaded.');
        return;
    }

    var result = calcTriangle(prediction, trackPointA.id, trackPointB.id);
    console.log('calcTriangle', result);
    // position
    mainModel.position.set(result.position.x, result.position.y, 0);
    
    // cannot get the rotation from the LandmarksTracker
    // mainModel.material.rotation = 0;

    // scale
    mainModel.scale.setScalar(initScale * result.scale);
}

function calcTriangle(prediction, id1, id2) {
    var a = prediction[id1];
    var b = prediction[id2];
    
    // position
    var center_x = (a.x + b.x) / 2;
    var center_y = (a.y + b.y) / 2;
    var center = {
        x: center_x - canvasWidth / 2,
        y: canvasHeight / 2 - center_y,
    };

    // scale
    var ratio = 375 / canvasWidth;
    var scale = (b.x - a.x) / (trackPointB.x - trackPointA.x);
    scale = scale * ratio;

    return {
        position: center,
        scale: scale,
    };
}

function setSceneBackground(frame) {
    var texture = new THREE.DataTexture(frame.data,
        frame.width,
        frame.height,
        THREE.RGBAFormat);
    texture.flipY = true;
    texture.needsUpdate = true;
    scene.background = texture;
}

function clearSceneBackground() {
    scene.background = null;
}

function animate() {
    requestId = canvas.requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

function stopAnimate() {
    if (canvas && requestId) {
        canvas.cancelAnimationFrame(requestId);
    }
}

function dispose() {
    camera = null;
    scene = null;
    renderer = null;
    canvas = null;
    THREE = null;
    mainModel = null;
    requestId = null;
    canvasWidth = null;
    canvasHeight = null;
}

module.exports = {
    initThree,
    stopAnimate,
    updateModel,
    setModel,
    setSceneBackground,
    clearSceneBackground,
    dispose,
}