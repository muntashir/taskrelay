const WebSocket = require('ws');
const shortid = require('shortid');

class Client {
  constructor(serverList) {
    this.callbacks = {};
    this.functions = {};
    this.isConnected = false;
    this.serverList = serverList;
    shuffleArray(this.serverList);
  }

  _readResponseHeader(response) {
    const responseHeader = binaryToString(response.subarray(0, this.headerSize)).split('|');
    if (responseHeader[0] === '@r') {
      const responseHeaderParams = responseHeader[1].split(',');
      let responseId = null;
      let responseName = null;
      let responseSize = null;

      for (let i = 0; i < responseHeaderParams.length; i++) {
        const param = responseHeaderParams[i].split(':');

        if (param[0] === 'n') {
          responseName = param[1].trim();
        } else if (param[0] === 's') {
          responseSize = parseInt(param[1].trim(), 10);
        } else if (param[0] === 'd') {
          responseId = param[1].trim();
        }
      }

      if (responseId && responseName && responseSize) {
        return {
          id: responseId,
          name: responseName,
          size: responseSize
        };
      } else {
        return {
          error: 'Server sent invalid response'
        };
      }
    } else {
      return {
        error: 'Server sent invalid response'
      };
    }
  }

  _readResponseParams(response, responseHeader) {
    const outputSchema = this.functions[responseHeader.name].outputs;
    const outputs = {};
    let offset = 0;
    let bytesRead = 0;

    for (let i = 0; i < Object.keys(outputSchema).length; i++) {
      const startPos = this.headerSize + offset + (i * this.headerSize);
      const endPos = startPos + this.headerSize;
      const parameters = binaryToString(response.subarray(startPos, endPos)).split(',');
      bytesRead += this.headerSize;

      let outputName = null;
      let outputType = null;
      let outputSize = null;

      for (let j = 0; j < parameters.length; j++) {
        const param = parameters[j].split(':');

        if (param[0] === 'o') {
          outputName = param[1].trim();
        } else if (param[0] === 's') {
          outputSize = parseInt(param[1].trim(), 10);
        } else if (param[0] === 't') {
          outputType = param[1].trim();
        }
      }

      if (outputName && outputType && outputSize) {
        if (!outputSchema.hasOwnProperty(outputName) || outputType !== outputSchema[outputName]) {
          return {
            error: 'Invalid input parameter'
          };
        }

        offset += outputSize;
        bytesRead += outputSize;

        const rawOutputData = response.subarray(endPos, endPos + outputSize);
        let outputData = null;

        if (outputType === 'string') {
          outputData = binaryToString(rawOutputData).trim();
        } else if (outputType === 'integer') {
          outputData = parseInt(binaryToString(rawOutputData).trim(), 10);
        } else if (outputType === 'float') {
          outputData = parseFloat(binaryToString(rawOutputData).trim());
        } else if (outputType === 'boolean') {
          outputData = (binaryToString(rawOutputData).trim() === '1');
        } else if (outputType === 'binary') {
          outputData = rawOutputData;
        }

        if (outputData) {
          outputs[outputName] = outputData;
        } else {
          return {
            error: 'Invalid response type'
          };
        }
      } else {
        return {
          error: 'Missing response parameter'
        };
      }
    }

    return {
      outputs: outputs,
      bytesRead: bytesRead
    };
  }

  _responseHandler(response, flags) {
    if (flags.binary) {
      const responseHeader = this._readResponseHeader(response);
      if (responseHeader && responseHeader.hasOwnProperty('error')) {
        console.log(responseHeader['error']);
        return;
      } else if (!responseHeader) {
        console.log('Invalid response format');
        return;
      }

      let callback = null;
      if (this.callbacks.hasOwnProperty(responseHeader.id)) {
        callback = this.callbacks[responseHeader.id];
      } else {
        console.log('Invalid response ID');
        return;
      }

      let error = null;
      const responseParams = this._readResponseParams(response, responseHeader);
      if (responseParams && responseParams.hasOwnProperty(error)) {
        error = responseParams.error;
      } else if (!responseParams) {
        error = 'Invalid response';
      }

      if (responseParams.bytesRead !== responseHeader.size) {
        error = 'Invalid packet size';
      }

      let callbackParams = null;
      if (!error && responseParams.hasOwnProperty('outputs')) {
        callbackParams = responseParams.outputs;
      }
      callback(error, callbackParams);
      delete this.callbacks[responseHeader.id];
    } else {
      console.log('Server sent invalid response');
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
          that._decodeHeader(data);

          ws.on('message', that._responseHandler.bind(that));
          that.ws = ws;

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
      const packetId = shortid.generate();
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
          }

          const inputSize = inputValue.length;
          const inputHeaderStr = `i:${inputName},t:${inputSchema},s:${inputSize}`;
          const inputHeader = stringToBinary(inputHeaderStr, this.headerSize);
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
      }

      const packetSize = packetBody.length;
      packetHeader += `,s:${packetSize}`;
      packetHeader = stringToBinary(packetHeader, this.headerSize);

      const packet = concatBuffers(packetHeader, packetBody);
      this.ws.send(packet, {
        binary: true,
        mask: true
      });
    } else {
      cb('Invalid function input', null);
      return;
    }
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
