const tracking = require('../../utils/tracking.js');

const jsfeat = require('../../utils/jsfeat.js');

const fastThreshold = 20;
const blurRadius = 2;
const descriptorLength = 128;
const minMatchNumber = 10; // custom tracker

var ImageTracker = function (patternImageArray) {
  ImageTracker.base(this, 'constructor');

  if (patternImageArray) {
    this.setPattern(patternImageArray);
  }
};

tracking.inherits(ImageTracker, tracking.Tracker);

ImageTracker.prototype.track = function (pixels, width, height) {
  var _that = this;

  var patterns = _that.getPattern();

  if (!patterns) {
    console.log('Pattern not specified.');
    return;
  }  
  
  // start
  var start = new Date();
  var results = _that.trackImage_(patterns, pixels, width, height);
  // end
  var end = new Date() - start;
  console.log('detect', end, 'ms');
  results.end = end;

  // optional

  this.emit('track', {
    data: results
  });
  return {
    data: results
  };
};

ImageTracker.prototype.setPattern = function (patternImageArray) {
  this.pattern = patternImageArray;
};

ImageTracker.prototype.getPattern = function () {
  return this.pattern;
};

ImageTracker.prototype.calcTransform = function (matches, patternWidth, patternHeight) {
  var ransac = jsfeat.motion_estimator.ransac;
  var homography2d_kernel = new jsfeat.motion_model.homography2d();
  var transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
  var from = [];
  var to = [];
  var newFrom = [];
  var newTo = [];
  var count = matches.length; // width 375 and height 375 are the origin size of the pattern image.

  var widthRatio = 375 / patternWidth;
  var heightRatio = 375 / patternHeight;

  for (var i = 0; i < count; i++) {
    var match = matches[i];
    from[i] = {
      x: match.keypoint1[0] * widthRatio,
      y: match.keypoint1[1] * heightRatio
    };
    to[i] = {
      x: match.keypoint2[0],
      y: match.keypoint2[1]
    };
  }

  var mask = new jsfeat.matrix_t(count, 1, jsfeat.U8_t | jsfeat.C1_t); // minimum points to estimate motion

  var model_size = 4; // max error to classify as inlier

  var thresh = 3; // max outliers ratio

  var eps = 0.5; // probability of success

  var prob = 0.99;
  var params = new jsfeat.ransac_params_t(model_size, thresh, eps, prob);
  var max_iters = 1000;
  var goodMatch = 0;
  var isOK = ransac(params, homography2d_kernel, from, to, count, transform, mask, max_iters);

  if (isOK) {
    newFrom = from.filter(function (item, index) {
      return mask.data[index];
    });
    newTo = to.filter(function (item, index) {
      return mask.data[index];
    });
    goodMatch = newFrom.length;
  }

  homography2d_kernel.run(newFrom, newTo, transform, goodMatch);
  return {
    transform: transform,
    goodMatch: goodMatch,
    landmarks: newTo
  };
};

ImageTracker.prototype.trackImage_ = function (patterns, pixels, width, height) {
  tracking.Brief.N = descriptorLength;
  tracking.Fast.THRESHOLD = fastThreshold;
  var transformDataArray = []; // camera image

  var blur2 = tracking.Image.blur(pixels, width, height, blurRadius);
  var gray2 = tracking.Image.grayscale(blur2, width, height);
  var corners2 = tracking.Fast.findCorners(gray2, width, height);
  var descriptors2 = tracking.Brief.getDescriptors(gray2, width, corners2);
  var goodIndex = -1; // pattern image

  for (var i = 0; i < patterns.length; i++) {
    var pattern = patterns[i]; // blur

    var blur1 = tracking.Image.blur(pattern.pixels, pattern.width, pattern.height, blurRadius); // grayscale

    var gray1 = tracking.Image.grayscale(blur1, pattern.width, pattern.height); // find corners

    var corners1 = tracking.Fast.findCorners(gray1, pattern.width, pattern.height); // get descriptors

    var descriptors1 = tracking.Brief.getDescriptors(gray1, pattern.width, corners1); // match corners

    var matches = tracking.Brief.reciprocalMatch(corners1, descriptors1, corners2, descriptors2); // calculate transform 

    var transformData = this.calcTransform(matches, pattern.width, pattern.height); // save data

    transformDataArray.push(transformData);

    if (transformDataArray[i].goodMatch >= minMatchNumber) {
      goodIndex = i;
      break;
    }
  }

  if (goodIndex === -1) {
    return {
      prediction: null
    };
  } else {
    var properTransform = transformDataArray[goodIndex];
    var properPattern = patterns[goodIndex];
    return {
      prediction: {
        goodMatch: properTransform.goodMatch,
        transform: properTransform.transform,
        landmarks: transformData.landmarks
      }
    };
  }
};

module.exports = ImageTracker;