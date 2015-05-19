var fs = require('fs');
module.exports = {
  F: function(filePath) {
    return ''+fs.readFileSync(filePath, 'utf8');
  }
};