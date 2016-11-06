const servicer = require('./servicer');
const fs = require('fs');

client = new servicer.Client([
  ['127.0.0.1', 1234],
  ['127.0.0.1', 5678]
]);

fs.readFile('test.jpg', (err, file) => {
  if (!err) {
    client.connect((err, serverInfo) => {
      if (err) {
        console.log(err);
      } else {
        console.log(JSON.stringify(serverInfo, null, 2));

        client.callFunction('classify_jpg', {
          image: file
        }, (err, results) => {
          if (err) {
            console.log(err);
          } else {
            console.log(results);
          }
        });
      }
    });
  }
});
