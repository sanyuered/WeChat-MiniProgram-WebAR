const tracking = require('../../utils/tracking.js')
const jsfeat = require('../../utils/jsfeat.js')
const fastThreshold = 20;
const blurRadius = 2;
const descriptorLength = 256;
const minMatchNumber = 10;

// custom tracker
var ImageTracker = function (patternImageArray) {
  ImageTracker.base(this, 'constructor');
  if (patternImageArray) {
    this.setPattern(patternImageArray);
  }
}
tracking.inherits(ImageTracker, tracking.Tracker);
ImageTracker.prototype.track = function (pixels, width, height) {
  var _that = this;
  var patterns = _that.getPattern();

  if (!patterns) {
    console.log('Pattern not specified.');
    return;
  }

  var results = [];
  results = _that.trackImage_(patterns, pixels, width, height);

  this.emit('track', {
    data: results,
  });
}
ImageTracker.prototype.setPattern = function (patternImageArray) {
  this.pattern = patternImageArray;
}
ImageTracker.prototype.getPattern = function () {
  return this.pattern;
};
ImageTracker.prototype.calcTransform = function (matches) {
  var ransac = jsfeat.motion_estimator.ransac;
  var homography2d_kernel = new jsfeat.motion_model.homography2d();
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
  // minimum points to estimate motion
  var model_size = 4;
  // max error to classify as inlier
  var thresh = 3;
  // max outliers ratio
  var eps = 0.5;
  // probability of success
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
    goodMatch: goodMatch
  };

};
ImageTracker.prototype.trackImage_ = function (patterns, pixels, width, height) {
  tracking.Brief.N = descriptorLength;
  tracking.Fast.THRESHOLD = fastThreshold;
  var transformDataArray = [];
  var blur2 = tracking.Image.blur(pixels, width, height, blurRadius);
  var gray2 = tracking.Image.grayscale(blur2, width, height);
  var corners2 = tracking.Fast.findCorners(gray2, width, height);
  var descriptors2 = tracking.Brief.getDescriptors(gray2, width, corners2);
  var goodIndex = 0;
  
  for (var i = 0; i < patterns.length; i++) {
    var pattern = patterns[i];
    // blur
    var blur1 = tracking.Image.blur(pattern.pixels, pattern.width, pattern.height, blurRadius);
    // grayscale
    var gray1 = tracking.Image.grayscale(blur1, pattern.width, pattern.height);
    // find corners
    var corners1 = tracking.Fast.findCorners(gray1, pattern.width, pattern.height);
    // get descriptors
    var descriptors1 = tracking.Brief.getDescriptors(gray1, pattern.width, corners1);
    // match corners
    var matches = tracking.Brief.reciprocalMatch(corners1, descriptors1, corners2, descriptors2);
    // calculate transform 
    var transformData = this.calcTransform(matches);
    transformDataArray.push(transformData);

    if (transformDataArray[i].goodMatch >= minMatchNumber) {
      goodIndex = i;
      break;
    }
  }

  var properTransform = transformDataArray[goodIndex];
  var properPattern = patterns[goodIndex];

  return {
    goodMatch: properTransform.goodMatch,
    transform: properTransform.transform,
    width: properPattern.width,
    height: properPattern.height,
  };
};

ImageTracker.perspective_transform = function (
  src_x0, src_y0, dst_x0, dst_y0,
  src_x1, src_y1, dst_x1, dst_y1,
  src_x2, src_y2, dst_x2, dst_y2,
  src_x3, src_y3, dst_x3, dst_y3) {
  var transform = new jsfeat.matrix_t(3, 3, jsfeat.F32_t | jsfeat.C1_t);
  jsfeat.math.perspective_4point_transform(transform,
    src_x0, src_y0, dst_x0, dst_y0,
    src_x1, src_y1, dst_x1, dst_y1,
    src_x2, src_y2, dst_x2, dst_y2,
    src_x3, src_y3, dst_x3, dst_y3);
  return transform;
};

ImageTracker.invert_transform = function (transform) {
  jsfeat.matmath.invert_3x3(transform, transform);
};

/*
Reference: https://github.com/josundin/magcut/blob/master/js/imagewarp.js
Author: josundin
Title: image warp
License: MIT
*/
ImageTracker.warp_perspective_color = function (src, dst, transform) {
  var dst_width = dst.width | 0, dst_height = dst.height | 0;
  var src_width = src.width | 0, src_height = src.height | 0;
  var x = 0, y = 0, off = 0, ixs = 0, iys = 0, xs = 0.0, ys = 0.0, xs0 = 0.0, ys0 = 0.0, ws = 0.0, sc = 0.0, a = 0.0, b = 0.0, p0r = 0.0, p1r = 0.0, p0g = 0.0, p1g = 0.0, p0b = 0.0, p1b = 0.0;
  var td = transform;
  var m00 = td[0], m01 = td[1], m02 = td[2],
    m10 = td[3], m11 = td[4], m12 = td[5],
    m20 = td[6], m21 = td[7], m22 = td[8];
  var dptr = 0;

  for (var i = 0; i < dst_height; ++i) {
    xs0 = m01 * i + m02,
      ys0 = m11 * i + m12,
      ws = m21 * i + m22;
    for (var j = 0; j < dst_width; j++ , dptr += 4, xs0 += m00, ys0 += m10, ws += m20) {
      sc = 1.0 / ws;
      xs = xs0 * sc, ys = ys0 * sc;
      ixs = xs | 0, iys = ys | 0;

      if (xs > 0 && ys > 0 && ixs < (src_width - 1) && iys < (src_height - 1)) {

        a = Math.max(xs - ixs, 0.0);
        b = Math.max(ys - iys, 0.0);
        //off = (src_width*iys + ixs)|0;
        off = (((src.width * 4) * iys) + (ixs * 4)) | 0;

        p0r = src.data[off] + a * (src.data[off + 4] - src.data[off]);
        p1r = src.data[off + (src_width * 4)] + a * (src.data[off + (src_width * 4) + 4] - src.data[off + (src_width * 4)]);

        p0g = src.data[off + 1] + a * (src.data[off + 4 + 1] - src.data[off + 1]);
        p1g = src.data[off + (src_width * 4) + 1] + a * (src.data[off + (src_width * 4) + 4 + 1] - src.data[off + (src_width * 4) + 1]);

        p0b = src.data[off + 2] + a * (src.data[off + 4 + 2] - src.data[off + 2]);
        p1b = src.data[off + (src_width * 4) + 2] + a * (src.data[off + (src_width * 4) + 4 + 2] - src.data[off + (src_width * 4) + 2]);

        dst.data[dptr + 0] = p0r + b * (p1r - p0r);
        dst.data[dptr + 1] = p0g + b * (p1g - p0g);
        dst.data[dptr + 2] = p0b + b * (p1b - p0b);

        dst.data[((i * (dst.width * 4)) + (j * 4)) + 3] = 255;
      }
      else {
        dst.data[((i * (dst.width * 4)) + (j * 4)) + 3] = 0;
      }
    }
  }
};

module.exports = ImageTracker;
