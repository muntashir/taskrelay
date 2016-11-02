const servicer = require('./servicer');

client = new servicer.Client([
  ['127.0.0.1', 1234],
  ['127.0.0.1', 5678]
]);

client.connect((err, serverInfo) => {
  if (err) {
    console.error(err);
  } else {
    console.log(JSON.stringify(serverInfo, null, 2));

    client.callFunction('classify_jpg', {
      image: 'test'
    }, (err, results) => {

    });
  }
});