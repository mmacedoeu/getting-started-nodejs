var express = require('express');
var path = require('path');

var app = express();
var publicPath = path.resolve(__dirname, 'app');
app.use(express.static(publicPath));

var port = process.env.PORT || 5000;
app.listen(port);

module.exports = app;
