var request = require('request');
var qrcode = require('jsqrcode')(require('canvas'));
var protobuf = require('protocol-buffers');
var fs = require("fs");
var url = require("url");

function enumInverter(enumDef) {
  var lookup = [];
  for (var name in enumDef) {
    // let's lowercase our enum values instead of keeping them all-caps
    lookup[enumDef[name]] = name.toLowerCase();
  }
  return function valueToName(enumValue) {
    return (enumValue || enumValue === 0) ? lookup[enumValue] : enumValue;
  };
}

var deviceParams = protobuf(
  fs.readFileSync(__dirname + '/CardboardDevice.proto')).DeviceParams;

// AFAICT there's no way for protocol-buffers to do this automatically:
// https://github.com/mafintosh/protocol-buffers/issues/60
// There'd be a way to do it more smartly (reading the schema by calling
// toJSON from the protobuf return), but meh.

var verticalAlignmentTypeInverter =
  enumInverter(deviceParams.VerticalAlignmentType);
var buttonTypeInverter = enumInverter(deviceParams.ButtonType);

function profileObjectFromDecodedProtobuf(decodedObj) {
  decodedObj.primary_button = buttonTypeInverter(decodedObj.primary_button);
  decodedObj.vertical_alignment =
    verticalAlignmentTypeInverter(decodedObj.vertical_alignment);
  return decodedObj;
}

var googlRegexp = /^goo\.gl\//;
var cardboardConfigRegexp = /^http:\/\/google\.com\/cardboard\/cfg/;

function base64FromUrl(s) {
  s = s + '==='.slice(0, [0, 3, 2, 1][s.length % 4]);
  return s.replace(/-/g, '+').replace(/_/g, '/');
}

function bufferFromUrlB64(urlB64) {
  return new Buffer(base64FromUrl(urlB64), 'base64');
}

// https://wwgc.firebaseapp.com/js/Cardboard.js

function cardboardConfigURLToJson(configUrl) {
  if (cardboardConfigRegexp.test(configUrl)) {
    var base64Profile = url.parse(configUrl, true).query.p;
    if (base64Profile) {
      return profileObjectFromDecodedProtobuf(
        deviceParams.decode(bufferFromUrlB64(base64Profile)));
    }
  } else {
    throw new Error("URL doesn't appear to be a Cardboard config URL: " + url);
  }
}

module.exports = function qrImageToJsonObject(image) {
  return new Promise(function(resolve, reject) {
    try {
      var qrContent = qrcode.decode(image);
      if (googlRegexp.test(qrContent)) {
        return request({
          url: 'https://' + qrContent,
          followRedirect: false
        }, function(err, res) {
          if (err) return reject(err);
          else try {
            if (res.statusCode < 300 || res.statusCode >= 400) {
              throw new Error(
                "goo.gl response wasn't a redirect: " + res.statusCode);
            }
            var profileJson = cardboardConfigURLToJson(res.headers.location);

            // augment the profile JSON with a record of how we got it
            profileJson.original_url = qrContent;

            return resolve(profileJson);
          } catch (e) {
            return reject(e);
          }
        });
      } else {
        return reject(new Error(
          "QR doesn't appear to be a goo.gl URL: " + qrContent));
      }
    } catch (e) {
      return reject(new Error("Couldn't read QR code"));
    }
  });
};
