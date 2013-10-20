"use strict";

var
  Twit = require('twit'),
  when = require('when'),
  request = require('request');

function resolvePromise(promise) {
  return function (err, reply) {
    if (err)
      promise.reject(err);
    else
      promise.resolve(reply);
  }
}

function processTweets(promise) {
  return function(tweets){
    promise.resolve(when.map(tweets.statuses, processTweet));
  }
}

function processTweet(tweet) {
  var vineUrlMatch = /https?:\/\/t\.co\/[A-Za-z0-9]+/.exec(tweet.text); // Vine URL match
  var result = when.defer(); // result promise
  var t = {}; // the return object

  if (!vineUrlMatch)
    return result.reject(new Error("Could not find "));

  t.user = tweet.user.screen_name;
  t.id = tweet.id_str;
  t.text = tweet.text;
  t.vineUrl = vineUrlMatch[0];
  t.vidUrl = '';
  t.thumbUrl = '';

  request(t.vineUrl, function(err, response, body) {
    if (err)
      result.reject(err);

    var videoMatch = /<meta.*?property="twitter:player:stream".*?content="(.*?)"/.exec(body);
    var thumbnailMatch = /<meta.*?property="og:image".*?content="(.*?)"/.exec(body);

    if (videoMatch && thumbnailMatch && response.statusCode == 200) {
      t.vidUrl = videoMatch[1];
      t.thumbUrl = thumbnailMatch[1];
      result.resolve(t);
    }
    else
      result.reject(new Error("Error while scraping vine page for tweet " + t.text));
  });

  return result.promise;
}

module.exports = {

  config: {
    twitterCredentials: {
      consumer_key: 'gA11sspNJdtdCL2gWDQqFA',
      consumer_secret: 'uhBxdHaryjLcAcC9D985WYNbyT9LAzK03FMDbfnBZfc',
      access_token: '150977185-F3trFzvsc3qjFd8DlrMbkWJXjj97IiHkifvP4EjR',
      access_token_secret: 'GOA66sBv471fk8HPYSwomCsarmeO17FYg0Fa6Ao9E'
    },
    defaults: {
      query: "",
      retweets: false,
      count: 10,
      result_type: "recent",
      max_id: 0
    }
  },

  searchTwitter: function (options) {
    var deferred = when.defer();
    var twit = new Twit(this.config.twitterCredentials);

    twit.get('search/tweets', options, resolvePromise(deferred));

    return deferred.promise;
  },

  search: function (query, retweets, count, result_type, max_id) {
    if (typeof query === 'undefined')
      query = this.config.defaults.query;
    if (typeof retweets === 'undefined')
      retweets = this.config.defaults.retweets;
    if (typeof count === 'undefined')
      count = this.config.defaults.count;
    if (typeof result_type === 'undefined')
      result_type = this.config.defaults.result_type;
    if (typeof max_id === 'undefined')
      max_id = this.config.defaults.max_id;

    var vineString = 'vine.co/v/';  // String used to search twitter for vine videos. I used to use source: blah, but they changed it up and now it doesn't work.
    var q;  // the query to be search twitter with.
    var partialResultDeferred = when.defer(); // partial result. will get a promise of a list of promises because there is a lot of uncertainty in the world
    var resultDeferred = when.defer(); // the actual result
    q = query + " " + vineString;
    if (retweets)
      q = q + " " + "exclude:retweets";

    this.searchTwitter(
      {
        q: q,
        result_type: result_type,
        count: count,
        max_id: max_id
      }
    ).then(processTweets(partialResultDeferred)).otherwise(partialResultDeferred.reject);

    // break down the list. if there was a problem bubble the problem up.
    when
      .settle(partialResultDeferred.promise)
      .then(function (partialResult) {
        var result = partialResult
          .filter(function (item) {
            return item.state === 'fulfilled';
          })
          .map(function (item) {
            return item.value;
          });

        resultDeferred.resolve(result);
      })
      .otherwise(resultDeferred.reject);

    return resultDeferred.promise;
  }
};