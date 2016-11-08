# TaskRelay

[![npm](https://img.shields.io/npm/v/taskrelay.svg)](https://www.npmjs.com/package/taskrelay) [![PyPI](https://img.shields.io/pypi/v/taskrelay.svg)](https://pypi.python.org/pypi/taskrelay/0.1.0)

A library to run tasks on remote servers. Currently only has a Python 3.5 server and a Node.js client.

You can pass in multiple inputs and get back multiple outputs. See the examples to learn how to do this. You can also have multiple servers and the client will choose one to connect to.

## Installation
### Python 3.5
`pip3 install taskrelay`
### Node.js
`npm install taskrelay`

## Supported Data Types
* string
* float
* binary
* integer
* boolean

## Python 3.5 Server Example
```python
import taskrelay

def task(parameter):
    # Do something with parameter here
    return_value = 'example'
    return {'return_value': return_value}

server = taskrelay.Server()

server.create_task(
    name = 'example_task',
    inputs = {'parameter': 'float'}, # See supported data types
    outputs = {'return_value': 'string'},
    function = task)

server.start_server('localhost', 1234)
```

## Node.js Client Example
```javascript
const taskrelay = require('taskrelay');

client = new taskrelay.Client([
  ['127.0.0.1', 1234],
  ['127.0.0.1', 5678] // Only one of these will be used
]);


client.connect((err, serverInfo) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(serverInfo, null, 2));

    client.runTask('example_task', { parameter: 1.234 }, (err, results) => {
      if (err) {
        console.error(err);
      } else {
        console.log(results);
      }
    });
  }
});
```
