"use strict";

var Twit = require('twit'),
  when = require('when'),
  request = require('request'),
  _ = require('lodash'),
  config = require('../config');


function argObj(args, argNames, defaultArgs) {
  var result;

  if (typeof args[0] === 'object' && args.length === 1) {
    result = args[0];
  } else {
    result = _.zipObject(argNames, [].slice.call(args));
  }

  return _.defaults(result, defaultArgs);
}

function promiseCallback(promise) {
  return function (err, reply) {
    if (err)
      promise.reject(err);
    else
      promise.resolve(reply);
  }
}

function processTweet(tweet) {
  var vineUrlMatch = /https?:\/\/t\.co\/[A-Za-z0-9]+/.exec(tweet.text); // Vine URL match
  var result = when.defer(); // result promise
  var t = {}; // the return object
  if (!vineUrlMatch) {
    console.error("Could not find the vine URL");
    return result.reject(new Error("Could not find "));
  }

  t.user = tweet.user.screen_name;
  t.id = tweet.id_str;
  t.text = tweet.text;
  t.vineUrl = vineUrlMatch[0];
  t.vidUrl = '';
  t.thumbUrl = '';

  request(t.vineUrl, function (err, response, body) {
    if (err) {
      console.error("Url Invalid");
      result.reject(err);
    }

    var videoMatch = /<meta.*?property="twitter:player:stream".*?content="(.*?)"/.exec(body);
    var thumbnailMatch = /<meta.*?property="og:image".*?content="(.*?)"/.exec(body);

    if (videoMatch && thumbnailMatch && response.statusCode == 200) {
      t.vidUrl = videoMatch[1];
      t.thumbUrl = thumbnailMatch[1];
      result.resolve(t);
    }
    else {
      console.error("Could not scrape vine page: ", t.vineUrl);
      result.reject(new Error("Error while scraping vine page for tweet " + t.text));
    }
  });

  return result.promise;
}

module.exports = {

  config: config,

  tweetsBySearch: function (options) {
    var deferred = when.defer();
    var twit = new Twit(this.config.twitterCredentials);
    twit.get('search/tweets', options, promiseCallback(deferred));
    return deferred.promise;
  },

  search: function (query, retweets, count, resultType, maxId, maxRetries) {
    var args = argObj(arguments, ['query', 'retweets', 'count', 'resultType', 'maxId', 'maxRetries'], this.config.defaults);

    var vineString = 'vine.co/v/';  // String used to search twitter for vine videos. I used to use source: blah, but they changed it up and now it doesn't work.
    var q;  // the query to be search twitter with.

    q = args.query + ' ' + vineString;
    if (args.retweets) {
      q = q + ' ' + 'exclude:retweets';
    }

    return this.tweetsBySearch({ q: q, resultType: args.resultType, count: args.count, max_id: args.maxId })
      .then(function (tweets) {
        return when(_.map(tweets.statuses, processTweet));
      })
      .then(function (tweets) {
        return when.settle(tweets);
      })
      .then(function (tweetvineList) {
        var result = _(tweetvineList)
          .where({state: 'fulfilled'})
          .pluck('value')
          .value();

        if (result.length === args.count){
          return when.resolve(result);
        }
        else if (args.maxRetries > 0) {
          return this.search(_.assign(args, {maxRetries: args.maxRetries - 1}));
        }
        else {
          // if it's here, we didn't get all the results after retrying.
          // returns the results anyways, should probably have some sort of error
          // message :/

          return when.resolve(result);
        }
      }.bind(this));
  }
};
