require('dotenv').config()
var express = require('express');
var app = express();
var port = process.env.PORT || 3000
const functions = require('./app.js')


app.get('/', function(req, res) {
  res.sendFile('index.html', {root: __dirname});
});

app.get('/exportAppFeedback', function(req, res) {
  functions.exportAppFeedback().then(function(data){
    res.setHeader('Content-disposition', 'attachment; filename=AppFeedback.csv');
    res.set('Content-Type', 'text/csv');
    res.status(200).send(data);
  });
});

app.get('/exportDiningFeedback', function(req, res) {
  functions.exportDiningFeedback().then(function(data){
    res.setHeader('Content-disposition', 'attachment; filename=DiningFeedback.csv');
    res.set('Content-Type', 'text/csv');
    res.status(200).send(data);
  });
});

app.get('/exportDishData', function(req, res) {
  functions.exportDishData().then(function(data){
    res.setHeader('Content-disposition', 'attachment; filename=DishData.csv');
    res.set('Content-Type', 'text/csv');
    res.status(200).send(data);
  });
});


app.get('/update', function(req, res) {
  functions.downloadMenus()
  res.send('Update Attempted')
});

app.listen(port, function() {
  console.log('Example app listening on port ' + port + '!');
});
