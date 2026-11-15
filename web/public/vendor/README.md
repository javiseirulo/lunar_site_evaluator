# QR encoder

Project Nayuki, MIT license (included in the JavaScript header).
Source: https://www.nayuki.io/res/qr-code-generator-library/qrcodegen.js
Documentation: https://www.nayuki.io/page/qr-code-generator-library
Retrieved 2026-11-15. Original SHA-256:
2511bc17f40a3c41d4a0578995db956b38997334d3d20113a5d4dc5c49c69480.

Only formatting and a local `encodeQr` ES-module adapter are added. The adapter
also exposes `window.lunarQrEncode`; `ShareView` loads it on demand with a native
module script from this deployment, since Vite rejects source imports from
`public/`. Encoding runs locally, without sending the URL to a QR service.
The encoded URL contains coordinates/time/camera only, never Cesium credentials.
