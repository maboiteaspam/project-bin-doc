module.exports = {
  F: function(filePath) {
    return require('fs').readFileSync(filePath, 'utf8').toString();
  }
};