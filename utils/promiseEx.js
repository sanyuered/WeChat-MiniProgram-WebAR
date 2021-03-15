function promiseEx(method, option) {
    return new Promise((resolve, reject) => {
      method({
        ...option,
        success: function(result) {
          resolve(result);
        },
        fail: function(error) {
          reject(error);
        }
      });
    });
}

module.exports = promiseEx;