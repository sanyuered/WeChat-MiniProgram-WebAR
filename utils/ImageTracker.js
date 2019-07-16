const tracking = require('./tracking.js')
const jsfeat = require('./jsfeat.js')
const fastThreshold = 20;
const blurRadius = 2;
const descriptorLength = 256;
const minGoodMatch = 4;

// custom tracker
var ImageTracker = function (patternPixels, width, height) {
  ImageTracker.base(this, 'constructor');

  if (patternPixels) {
    this.setPattern(patternPixels, width, height);
  }
}
tracking.inherits(ImageTracker, tracking.Tracker);
ImageTracker.prototype.track = function (pixels, width, height) {
  var _that = this;
  var pattern = _that.getPattern();

  if (!pattern) {
    console.log('Pattern not specified.');
    return;
  }

  var results = [];
  results = _that.trackImage_(pattern, pixels, width, height);

  this.emit('track', {
    data: results,
  });
}
ImageTracker.prototype.setPattern = function (patternPixels, width, height) {
  this.pattern = {
    pixels: patternPixels,
    width: width,
    height: height,
  };
}
ImageTracker.prototype.getPattern = function () {
  return this.pattern;
};
ImageTracker.prototype.calcTransform = function (matches) {
  var ransac = jsfeat.motion_estimator.ransac;
  var affine2d_kernel = new jsfeat.motion_model.affine2d();
  var transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
  var from = [];
  var to = [];
  var newFrom = [];
  var newTo = [];
  var count = matches.length;

  for (var i = 0; i < count; i++) {
    var match = matches[i];
    from[i] = {
      x: match.keypoint1[0],
      y: match.keypoint1[1]
    };
    to[i] = {
      x: match.keypoint2[0],
      y: match.keypoint2[1]
    };
  }

  var mask = new jsfeat.matrix_t(count, 1, jsfeat.U8_t | jsfeat.C1_t);
  var model_size = 4;
  var thresh = 3;
  var eps = 0.5;
  var prob = 0.99;
  var params = new jsfeat.ransac_params_t(model_size, thresh, eps, prob);
  var max_iters = 1000;
  var goodMatch = 0;
  var isOK = ransac(params, affine2d_kernel, from, to, count, transform, mask, max_iters);

  if (isOK) {
    newFrom = from.filter(function (item, index) {
      return mask.data[index];
    });
    newTo = to.filter(function (item, index) {
      return mask.data[index];
    });
    goodMatch = newFrom.length;
  }

  affine2d_kernel.run(from, to, transform, goodMatch);

  return {
    transform: transform,
    goodMatch: goodMatch
  };

};

ImageTracker.prototype.trackImage_ = function (pattern, pixels, width, height) {
  tracking.Brief.N = descriptorLength;
  tracking.Fast.THRESHOLD = fastThreshold;

  // blur
  var blur1 = tracking.Image.blur(pattern.pixels, pattern.width, pattern.height, blurRadius);
  var blur2 = tracking.Image.blur(pixels, width, height, blurRadius);

  // grayscale
  var gray1 = tracking.Image.grayscale(blur1, pattern.width, pattern.height);
  var gray2 = tracking.Image.grayscale(blur2, width, height);

  // find corners
  var corners1 = tracking.Fast.findCorners(gray1, pattern.width, pattern.height);
  var corners2 = tracking.Fast.findCorners(gray2, width, height);
  console.log('found corners', corners1.length / 2, corners2.length / 2);

  // get descriptors
  var descriptors1 = tracking.Brief.getDescriptors(gray1, pattern.width, corners1);
  var descriptors2 = tracking.Brief.getDescriptors(gray2, width, corners2);

  // match corners
  var matches = tracking.Brief.reciprocalMatch(corners1, descriptors1, corners2, descriptors2);
  console.log('matched corners:', matches);

  // calculate transform 
  var transformData = this.calcTransform(matches);
  console.log('transformData:', transformData);
  if (transformData && transformData.goodMatch >= minGoodMatch) {
    return transformData;
  }

  return {
    data: [],
  }
};

module.exports = ImageTracker;
