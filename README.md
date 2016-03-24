# cardboard-qr-to-json

Node.js package for converting Google Cardboard profile QR codes to JSON
objects

## Usage

Requires a recent enough version of Node to have a native `Promise`
implementation. (`bin/detectDupes.js` requires a `Map` implementation.)

Having gathered a `qrcodes` directory of viewer QR codes in this project's
directory:

```bash
node bin/qrDirToArray.js qrcodes > qrcodes.json
```
