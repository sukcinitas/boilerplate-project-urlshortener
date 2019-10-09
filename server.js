"use strict";

var express = require("express");
var mongo = require("mongodb");
var mongoose = require("mongoose");
var bodyParser = require("body-parser");
var cors = require("cors");
const dns = require("dns");

var app = express();

// Basic Configuration
var port = process.env.PORT || 3000;

/** this project needs a db !! **/

// mongoose.connect(process.env.MONGOLAB_URI);
mongoose.connect(process.env.MONGO_URI, {
  useUnifiedTopology: true,
  useNewUrlParser: true
});
mongoose.set("useCreateIndex", true);

//creating Schema and model
var schema = new mongoose.Schema({
  short: { type: Number },
  original: { type: String },
  protocol: { type: String }
});
var ShortUrl = mongoose.model("ShortUrl", schema);

app.use(cors());

/** this project needs to parse POST bodies **/
// you should mount the body-parser here
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/public", express.static(process.cwd() + "/public"));

app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// your first API endpoint...
app.get("/api/hello", function(req, res) {
  res.json({ greeting: "hello API" });
});

var count = 0; // outside, so it would'nt be defined as 0 each time
app.post("/api/shorturl/new", function(req, res) {
  //valid format => valid site => url not in database => write it

  //is it a valid url format
  const urlReg = /https?\:\/\/www\.\w+\.\w\w\w?(\/w+)*$/;
  const validFormat = urlReg.test(req.body.url);

  if (validFormat) {
    //is it a valid site
    // dns.lookup lookups for hostname, so we extract it from url
    let hostname = req.body.url.split("www.")[1];
    dns.lookup(hostname, (err, address) => {
      if (address) {
        //need to check if adress is already in the database
        ShortUrl.find({ original: req.body.url.split("://")[1] }, function(
          err,
          data
        ) {
          if (err) {console.log(err); return;};
          if (data.length) {
            res.json({
              original_url: data[0].original,
              short_url: data[0].short
            });
          } else {
            count = ++count;
            var name = req.body.url.split("://");
            var shortie = new ShortUrl({
              original: name[1],
              short: count,
              protocol: name[0]
            });
            shortie.save(() =>
              res.json({ original_url: name[1], short_url: count })
            );
          }
        });
      } else {
        res.json({ error: "invalid URL" });
      }
    });
  } else {
    res.json({ error: "invalid URL" });
  }
});

//we get full url from database through short url
app.get("/api/shorturl/:shorturl", function(req, res) {
  ShortUrl.find({ short: req.params.shorturl }, function(err, data) {
    if (err) {console.log(err); return;};
    res.redirect(data[0].protocol + "://" + data[0].original);
  });
});

app.listen(port, function() {
  console.log("Node.js listening ...");
});
