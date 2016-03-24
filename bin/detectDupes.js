var fs = require('fs');
var Canvas = require('canvas');
var Image = Canvas.Image;
var qrcode = require('jsqrcode')(Canvas);


var targetDir = process.argv[2] || '.';

var seenMap = new Map();
var dupesMap = new Map();

Promise.all(fs.readdirSync(targetDir).map(function(filename) {
  return new Promise(function(resolve) {
    var image = new Image();
    image.onload = function() {
    try {
      var qrContent = qrcode.decode(image);
        if (dupesMap.has(qrContent)) {
          dupesMap.get(qrContent).push(filename);
        } else if (seenMap.has(qrContent)) {
          dupesMap.set(qrContent, [filename, seenMap.get(qrContent)]);
          seenMap.delete(qrContent);
        } else {
          seenMap.set(qrContent, filename);
        }
        return resolve();
      }
      catch (e) {
        return resolve();
      }
    };
    image.src = targetDir + '/' + filename;
  });
})).then(function(){
  dupesMap.forEach(function(filenames, url){
    console.log(url, filenames);
  });
});
