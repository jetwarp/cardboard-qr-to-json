var fs = require('fs');
var Image = require('canvas').Image;
var qrImageToJsonObj = require('../index.js');

var targetDir = process.argv[2] || '.';

function stringify(o) {
  return JSON.stringify(o, null, 2);
}

Promise.all(fs.readdirSync(targetDir).map(function(filename) {
  return new Promise(function(resolve) {
    var image = new Image();
    image.onload = function() {
      resolve(qrImageToJsonObj(image)
        .then(function(obj) {
          console.error('Completed: ' + filename);
          if (obj.vendor == '' && obj.model == '') {
            obj.hint = filename.replace(/_/g,' ').replace(/\.[^.]*$/,'');
          }
          return obj;
        }).catch(function(err){
          console.error('Error: ' + filename + ': ' + err.message);
        }));
    };
    image.src = targetDir + '/' + filename;
  });
})).then(stringify).then(console.log.bind(console,'%s'));
