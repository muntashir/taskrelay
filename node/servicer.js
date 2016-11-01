const WebSocket = require('ws');

class Client {
  constructor(serverList) {
    this.serverList = serverList;
    shuffleArray(this.serverList);
    this.isConnected = false;
  }

  responseHandler(data, flags) {
    if (flags.binary) {

    }
  }

  connect(cb) {
    for (let i = 0; i < this.serverList.length; i++) {
      const that = this;
      const ip = this.serverList[i][0];
      const port = this.serverList[i][1];

      let ws = new WebSocket(`ws://${ip}:${port.toString()}`);

      ws.on('error', err => {
        console.log(`[ws://${err.address}:${err.port}] - ${err.code}`);
      });

      ws.on('message', function receiveHeader(data, flags) {
        ws.removeListener('message', receiveHeader);

        if (!that.isConnected && flags.binary) {
          that.isConnected = true;
          console.log(`[${ws.url}] - Connected`);
          ws.on('message', that.responseHandler);
          that.ws = ws;

          const decodedData = binaryToString(data);
          console.log(binaryToString(data));
        }

        ws = null;
      });
    }
  }

  call(params) {
    ws.send(stringToBinary('Hello'), {
      binary: true,
      mask: true
    });
  }
}

function shuffleArray(a) {
  for (let i = a.length; i; i--) {
    let j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
}

function concatBuffers(buffer1, buffer2) {
  let newBuffer = new Uint8ClampedArray(buffer1.length + buffer2.length);
  newBuffer.set(buffer1);
  newBuffer.set(buffer2, buffer1.length);
  return newBuffer;
}

function binaryToString(buf) {
  return String.fromCharCode.apply(null, new Uint8ClampedArray(buf));
}

function stringToBinary(str) {
  if (str.length > HEADER_SIZE) {
    console.error('Header exceeds ${HEADER_SIZE} bytes');
  }

  let buf = new Uint8ClampedArray(HEADER_SIZE);
  for (let i = 0; i < str.length; i++) {
    let charCode = str.charCodeAt(i);

    if (charCode > 127) {
      console.error('Text must be ASCII');
    } else {
      buf[i] = charCode;
    }
  }

  return buf;
}

module.exports = {
  Client: Client
}
