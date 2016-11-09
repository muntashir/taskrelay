const taskrelay = require('./taskrelay');
const fs = require('fs');

const expectedServerInfo = {
  url: 'ws://127.0.0.1:5678',
  functions: {
    binary_test: {
      inputs: {
        input: 'binary'
      },
      outputs: {
        result: 'binary'
      }
    },
    boolean_test: {
      inputs: {
        input: 'boolean'
      },
      outputs: {
        result: 'boolean'
      }
    },
    string_test: {
      inputs: {
        input: 'string'
      },
      outputs: {
        result: 'string'
      }
    },
    integer_test: {
      inputs: {
        input: 'integer'
      },
      outputs: {
        result: 'integer'
      }
    },
    float_test: {
      inputs: {
        input: 'float'
      },
      outputs: {
        result: 'float'
      }
    },
    multi_test: {
      inputs: {
        input_boolean: 'boolean',
        input_integer: 'integer'
      },
      outputs: {
        result_float: 'float',
        result_string: 'string'
      }
    }
  }
}

function binaryToString(buf) {
  return String.fromCharCode.apply(null, new Uint8ClampedArray(buf));
}

function stringToBinary(str) {
  const buf = new Uint8ClampedArray(str.length);
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

client = new taskrelay.Client([
  ['127.0.0.1', 1234],
  ['127.0.0.1', 5678]
]);

client.connect((err, serverInfo) => {
  if (serverInfo) {
    console.log('Receive server information test passed');
  } else {
    console.error('Receive server information test failed');
    console.log(serverInfo);
  }

  const expected_binary = '1234567890abcdef';
  client.runTask('binary_test', {
    input: stringToBinary(expected_binary)
  }, (err, outputs) => {
    const result = outputs.result;
    if (typeof result === 'object' && binaryToString(result) === expected_binary) {
      console.log('Binary test (server -> client) passed');
    } else {
      console.error('Binary test (server -> client) failed');
      console.log(`${binaryToString(result)} !== ${expected_binary}`);
    }
  });

  const expected_boolean = false;
  client.runTask('boolean_test', {
    input: expected_boolean
  }, (err, outputs) => {
    const result = outputs.result;
    if (typeof result === 'boolean' && result === expected_boolean) {
      console.log('Boolean test (server -> client) passed');
    } else {
      console.error('Boolean test (server -> client) failed');
      console.log(`${result} !== ${expected_boolean}`);
    }
  });

  const expected_string = 'asdfghjkl';
  client.runTask('string_test', {
    input: expected_string
  }, (err, outputs) => {
    const result = outputs.result;
    if (typeof result === 'string' && result === expected_string) {
      console.log('String test (server -> client) passed');
    } else {
      console.error('String test (server -> client) failed');
      console.log(`${result} !== ${expected_string}`);
    }
  });

  const expected_integer = 12345;
  client.runTask('integer_test', {
    input: expected_integer
  }, (err, outputs) => {
    const result = outputs.result;
    if (typeof result === 'number' && Number.isInteger(result) && result === expected_integer) {
      console.log('Integer test (server -> client) passed');
    } else {
      console.error('Integer test (server -> client) failed');
      console.log(`${result} !== ${expected_integer}`);
    }
  });

  const expected_float = 1.2345;
  client.runTask('float_test', {
    input: expected_float
  }, (err, outputs) => {
    const result = outputs.result;
    if (typeof result === 'number' && !Number.isInteger(result) && result === expected_float) {
      console.log('Float test (server -> client) passed');
    } else {
      console.error('Float test (server -> client) failed');
      console.log(`${result} !== ${expected_float}`);
    }
  });

  const multi_input_boolean = false;
  const multi_input_integer = 567889014;
  const expected_result_string = 'test_label';
  const expected_result_float = 1.2345;
  client.runTask('multi_test', {
    input_boolean: multi_input_boolean,
    input_integer: multi_input_integer
  }, (err, outputs) => {
    const result_string = outputs.result_string;
    const result_float = outputs.result_float;
    if (result_string === expected_result_string && result_float === expected_result_float) {
      console.log('Multi test (server -> client) passed');
    } else {
      console.error('Multi test (server -> client) failed');
    }
  });

});
