const WebSocket = require('ws');
const uuid = require('node-uuid');

class Client {
  constructor(serverList) {
    this.callbacks = {};
    this.functions = {};
    this.isConnected = false;
    this.serverList = serverList;
    shuffleArray(this.serverList);
  }

  _responseHandler(data, flags) {
    if (flags.binary) {
      console.log(data);
    }
  }

  _decodeHeader(header) {
    const decodedData = binaryToString(header).split('|');

    if (decodedData[0] === '@w') {
      const headerSizeParam = decodedData[1].split(':');

      if (headerSizeParam[0] === 'h') {
        this.headerSize = parseInt(headerSizeParam[1], 10);

        for (let i = 2; i < decodedData.length; i++) {
          const functionMultiParams = decodedData[i].split(';');
          const functionInputs = {};
          const functionOutputs = {};
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
              functionInputs[inputName] = inputType;
            } else if (multiParam.hasOwnProperty('o') && multiParam.hasOwnProperty('t')) {
              const outputName = multiParam['o'];
              const outputType = multiParam['t'];
              functionOutputs[outputName] = outputType;
            } else if (multiParam.hasOwnProperty('n')) {
              functionName = multiParam['n'];
            } else {
              console.log('Invalid header parameter received')
            }
          }

          if (functionName && functionInputs && functionOutputs) {
            this.functions[functionName] = {
              inputs: functionInputs,
              outputs: functionOutputs
            };
          } else {
            console.log('Invalid function definition received');
          }
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
      this.socketErrorCount = 0;

      const that = this;
      const ip = this.serverList[i][0];
      const port = this.serverList[i][1];

      let ws = new WebSocket(`ws://${ip}:${port.toString()}`);

      ws.on('error', err => {
        console.log(`[ws://${err.address}:${err.port}] - ${err.code}`);
        this.socketErrorCount++;
        if (this.socketErrorCount === this.serverList.length) {
          cb('No servers reachable', null);
        }
      });

      ws.on('message', function receiveHeader(data, flags) {
        ws.removeListener('message', receiveHeader);

        if (!that.isConnected && flags.binary) {
          that.isConnected = true;
          this.socketErrorCount = 0;
          console.log(`[${ws.url}] - Connected`);
          ws.on('message', that._responseHandler);

          that.ws = ws;
          that._decodeHeader(data);

          cb(null, {
            url: ws.url,
            functions: that.functions
          });
        } else {
          this.socketErrorCount++;
        }

        ws = null;
      });
    }
  }

  callFunction(functionName, functionInputs, cb) {
    if (this.functions.hasOwnProperty(functionName)) {
      const packetId = uuid.v4();
      let packetHeader = `@j|n:${functionName},d:${packetId}`;
      let packetBody = null;

      this.callbacks[packetId] = cb;

      const functionInputKeys = Object.keys(functionInputs);
      for (let i = 0; i < functionInputKeys.length; i++) {
        const inputName = functionInputKeys[i];
        const rawInputValue = functionInputs[inputName];

        if (this.functions[functionName].inputs.hasOwnProperty(inputName)) {
          const inputSchema = this.functions[functionName].inputs[inputName];
          let inputValue = null;

          if (inputSchema === 'string') {
            if (typeof rawInputValue === 'string') {
              inputValue = stringToBinary(rawInputValue, rawInputValue.length);
            } else {
              cb('Invalid input type', null);
              return;
            }
          } else if (inputSchema === 'integer') {
            if (typeof rawInputValue === 'number' && Number.isInteger(rawInputValue)) {
              const intStr = rawInputValue.toString();
              inputValue = stringToBinary(intStr, intStr.length);
            } else {
              cb('Invalid input type', null);
              return;
            }
          } else if (inputSchema === 'float') {
            if (typeof rawInputValue === 'number' && !Number.isInteger(rawInputValue)) {
              const floatStr = rawInputValue.toString();
              inputValue = stringToBinary(floatStr, floatStr.length);
            } else {
              cb('Invalid input type', null);
              return;
            }
          } else if (inputSchema === 'boolean') {
            if (typeof rawInputValue === 'boolean') {
              const boolStr = (rawInputValue | 0).toString();
              inputValue = stringToBinary(boolStr, boolStr.length);
            } else {
              cb('Invalid input type', null);
              return;
            }
          } else if (inputSchema === 'binary') {
            if (typeof rawInputValue === 'object') {
              inputValue = rawInputValue;
            } else {
              cb('Invalid input type', null);
              return;
            }

            const inputSize = inputValue.length;
            const inputHeaderStr = `i:${inputName},t:${inputSchema},s:${inputSize}`;
            const inputHeader = stringToBinary(inputHeaderStr, self.headerSize);
            const inputBuffer = concatBuffers(inputHeader, inputValue);

            if (packetBody) {
              packetBody = concatBuffers(packetBody, inputBuffer);
            } else {
              packetBody = inputBuffer;
            }
          } else {
            cb('Invalid input type', null);
            return;
          }
        } else {
          cb('Invalid function input', null);
          return;
        }
      }
    } else {
      cb('Invalid function input', null);
      return;
    }

    const packetSize = packetBody.length;
    packetHeader += `,s:${packetSize}`;
    packetHeader = stringToBinary(packetHeader, self.headerSize);

    const packet = concatBuffers(packetHeader, packetBody);
    this.ws.send(packet, {
      binary: true,
      mask: true
    });
  }
}

function shuffleArray(a) {
  for (let i = a.length; i; i--) {
    const j = Math.floor(Math.random() * i);
    [a[i - 1], a[j]] = [a[j], a[i - 1]];
  }
}

function concatBuffers(buffer1, buffer2) {
  const newBuffer = new Uint8ClampedArray(buffer1.length + buffer2.length);
  newBuffer.set(buffer1);
  newBuffer.set(buffer2, buffer1.length);
  return newBuffer;
}

function binaryToString(buf) {
  return String.fromCharCode.apply(null, new Uint8ClampedArray(buf));
}

function stringToBinary(str, padding) {
  if (str.length > padding) {
    console.error(`Header exceeds ${padding} bytes`);
  }

  const buf = new Uint8ClampedArray(padding);
  for (let i = 0; i < str.length; i++) {
    const charCode = str.charCodeAt(i);

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