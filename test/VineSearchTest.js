"use strict";

var
  chai = require('chai'),
  should = chai.should(),
  chaiAsPromised = require("chai-as-promised"),
  vine = require("../lib/VineSearch"),
  when = require("when");

require("mocha-as-promised")();
chai.use(chaiAsPromised);

var tweetvinetemplate = {
  user: 'String',
  id : 'String',
  text : 'String',
  vineUrl : 'String',
  vidUrl : 'String',
  thumbUrl : 'String'
}; // example tweetvine object for comparisons

describe("vine", function() {
  describe("search", function() {
    var testSearch = vine.search();

    it("should return a list of tweet/vine (tweetvine?) objects ", function() {
      return testSearch.should.eventually.have.length(10);
    });

    it("each object in the list should have certain properties", function() {
      var keys = [];
      for(var k in tweetvinetemplate) keys.push(k);

      return when.map(testSearch, function(tweetvine) {
        return tweetvine.should.have.keys(keys);
      })
    });
  });
});