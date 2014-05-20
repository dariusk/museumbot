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

var baseUrl = 'http://www.metmuseum.org/collection/the-collection-online/search?ft=*&ao=on&noqs=true&rpp=30&pg=';

Array.prototype.pick = function() {
  return this[Math.floor(Math.random()*this.length)];
};

Array.prototype.pickRemove = function() {
  var index = Math.floor(Math.random()*this.length);
  return this.splice(index,1)[0];
};

function generate() {
  var dfd = new _.Deferred();

  var url = baseUrl + Math.floor(Math.random()*8758);
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var result = 'yo';
      var $ = cheerio.load(body);
      var $pics = $('.list-view-thumbnail > a');
      console.log($pics.length);
      var $pic = $pics.eq(Math.floor(Math.random()*$pics.length));
      var name = $pic.find('img').attr('alt');
      var thumbUrl = $pic.find('img').attr('src');
      var thingUrl = 'http://www.metmuseum.org' + $pic.attr('href');
      console.log(name, thumbUrl, thingUrl);
      // go to page for thing
      request(thingUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var $$ = cheerio.load(body);
          var bigImageUrl = $$('.download').attr('href');
          console.log(bigImageUrl);
          if (bigImageUrl) {
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
        }
      });
    }
    else {
      dfd.reject();
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
