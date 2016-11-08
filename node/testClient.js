const taskrelay = require('./taskrelay');
const fs = require('fs');

client = new taskrelay.Client([
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

        client.runTask('classify_jpg', {
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
