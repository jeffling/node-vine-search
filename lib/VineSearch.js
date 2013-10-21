"use strict";

var Twit = require('twit'),
  when = require('when'),
  request = require('request'),
  _ = require('lodash');


function argObj(args, argNames, defaultArgs) {
  var setDefaults = _.partialRight(_.assign, function(a, b) {
    return typeof a == 'undefined' ? b : a;
  }); // sets defaults if undefined
  var result;

  if (typeof args[0] === 'object' && args.length === 1) {
    result = args[0];
  } else {
    result = _.zipObject(argNames, [].slice.call(args));
  }
  return setDefaults(result, defaultArgs);
}


function promiseCallback(promise) {
  return function (err, reply) {
    if (err)
      promise.reject(err);
    else
      promise.resolve(reply);
  }
}

function processTweets(tweets) {
  return when(_.map(tweets.statuses, processTweet));
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

  tweetsBySearch: function (options) {
    var deferred = when.defer();
    var twit = new Twit(this.config.twitterCredentials);

    twit.get('search/tweets', options, promiseCallback(deferred));

    return deferred.promise;
  },

  search: function (query, retweets, count, result_type, max_id) {
    var args = argObj(arguments, ['query', 'retweets', 'count', 'result_type', 'max_id'], this.config.defaults);

    var vineString = 'vine.co/v/';  // String used to search twitter for vine videos. I used to use source: blah, but they changed it up and now it doesn't work.
    var q;  // the query to be search twitter with.
    var resultDeferred = when.defer(); // the actual result

    q = args.query + " " + vineString;
    if (args.retweets)
      q = q + " " + "exclude:retweets";

    this.tweetsBySearch({ q: q, result_type: args.result_type, count: args.count, max_id: args.max_id })
      .then(function(tweets) {
        return processTweets(tweets);
      })
      .then(function(tweets) {
        return when.settle(tweets);
      })
      .then(function (tweetvineList) {
        var result = _(tweetvineList)
          .where({state: 'fulfilled'})
          .pluck('value')
          .value();
        resultDeferred.resolve(result);
      })
      .otherwise(function(reason) {
        console.error(reason);
        resultDeferred.reject(reason);
      });

    return resultDeferred.promise;
  }
};
