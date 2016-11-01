const WebSocket = require('ws');

class Client {
  constructor(serverList) {
    this.functions = {};
    this.isConnected = false;
    this.serverList = serverList;
    shuffleArray(this.serverList);
  }

  responseHandler(data, flags) {
    if (flags.binary) {

    }
  }

  decodeHeader(header) {
    const decodedData = binaryToString(header).split('|');

    if (decodedData[0] === '@w') {
      const headerSizeParam = decodedData[1].split(':');

      if (headerSizeParam[0] === 'h') {
        this.headerSize = parseInt(headerSizeParam[1], 10);

        for (let i = 2; i < decodedData.length; i++) {
          const functionMultiParams = decodedData[i].split(';');
          const functionInputs = [];
          const functionOutputs = [];
          let functionName = '';

          for (let j = 0; j < functionMultiParams.length; j++) {
            const functionParams = functionMultiParams[j].split(',');
            const multiParam = {};

            for (let k = 0; k < functionParams.length; k++) {
              const functionParam = functionParams[k].split(':');
              multiParam[functionParam[0]] = functionParam[1];
            }

            if (multiParam.hasOwnProperty('i') && multiParam.hasOwnProperty('t')) {
              const inputName = multiParam['i'];
              const inputType = multiParam['t'];
              functionInputs.push({
                inputName: inputType
              });
            } else if (multiParam.hasOwnProperty('o') && multiParam.hasOwnProperty('t')) {
              const outputName = multiParam['o'];
              const outputType = multiParam['t'];
              functionOutputs.push({
                outputName: outputType
              });
            } else if (multiParam.hasOwnProperty('n')) {
              functionName = multiParam['n'];
            } else {
              console.log('Invalid header parameter received')
            }
          }

          this.functions[functionName] = {
            inputs: functionInputs,
            outputs: functionOutputs
          };
        }
      } else {
        console.log('Invalid header size parameter received');
      }
    } else {
      console.log('Invalid welcome message received');
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
          that.decodeHeader(data);
          ws.on('message', that.responseHandler);

          cb({
            url: ws.url,
            functions: that.functions
          });
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
