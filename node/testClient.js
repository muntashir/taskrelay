const servicer = require('./servicer');

client = new servicer.Client([
  ['127.0.0.1', 1234],
  ['127.0.0.1', 5678]
]);

client.connect((serverInfo) => {
  console.log(serverInfo);
});
