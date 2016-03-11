var fs = require('fs');
var request = require('request');
var cheerio = require('cheerio');
var _ = require('underscore');
_.mixin( require('underscore.deferred') );
var inflection = require('inflection');
var wordfilter = require('wordfilter');
// need to use this OTHER twitter lib to post photos, sigh
var conf = require('./config.js');
var Twitter = require('node-twitter');
var twitterRestClient = new Twitter.RestClient(
  conf.consumer_key,
  conf.consumer_secret,
  conf.access_token,
  conf.access_token_secret
);
var Tumblr = require('tumblrwks');
var tumblr = new Tumblr({
    consumerKey:    conf.tumblr_consumer_key,
    consumerSecret: conf.tumblr_consumer_secret,
    accessToken:    conf.tumblr_access_token,
    accessSecret:   conf.tumblr_access_token_secret
  }, "museumbot.tumblr.com"
);

//var baseUrl = 'http://www.metmuseum.org/collection/the-collection-online/search?ft=*&ao=on&noqs=true&rpp=30&pg=';
var baseUrl = 'http://www.metmuseum.org/api/collection/collectionlisting?artist=&department=&era=&geolocation=&material=&showOnly=withImage&sortBy=AccessionNumber&sortOrder=asc&page=';
console.log('hi');

Array.prototype.pick = function() {
  return this[Math.floor(Math.random()*this.length)];
};

Array.prototype.pickRemove = function() {
  var index = Math.floor(Math.random()*this.length);
  return this.splice(index,1)[0];
};

function generate() {
  var dfd = new _.Deferred();

console.log('going to req');
  var url = baseUrl + Math.floor(Math.random()*21200);
  request(url, function (error, response, body) {
    console.log('reqed',error, response.statusCode);
    if (!error && response.statusCode == 200) {
      var data = JSON.parse(body).results.pick();
      console.log(data);
      var name = data.title;
      var thingUrl = 'http://www.metmuseum.org' + data.url;
      var bigImageUrl = 'http://images.metmuseum.org/CRDImages/' + data.largeImage;
      // go to page for thing
      if (data.largeImage) {
        var stream = fs.createWriteStream('hires.jpg');
        stream.on('close', function() {
          console.log('done');
          dfd.resolve(name + ' ' + thingUrl, bigImageUrl, '<a href="' + thingUrl + '">' + name + '</a><br><br>The Metropolitan Museum of Art');
        });
        var r = request(bigImageUrl).pipe(stream);
      }
      else {
        dfd.reject();
        tweet();
      }
    }
    else {
      dfd.reject();
      tweet();
    }
  });

  return dfd.promise();
}

function tweet() {
  generate().then(function(myTweet, bigImageUrl, tumblrHtml) {
    if (!wordfilter.blacklisted(myTweet)) {
      console.log(myTweet);
      twitterRestClient.statusesUpdateWithMedia({
        'status': myTweet,
        'media[]': 'hires.jpg'
      },
      function(error, result) {
        if (error) {
          console.log('Error: ' + (error.code ? error.code + ' ' + error.message : error.message));
        }
        if (result) {
          console.log('yay it worked???');
          // Tumblr it
          tumblr.post('/post', {
            type: 'photo',
            source: bigImageUrl,
            caption: tumblrHtml,
            }, function(err, json){
            console.log(json, err);
          });
        }
      });
    }
  });
}

// Tweet once on initialization
tweet();
