var
  chai = require('chai'),
  should = chai.should(),
  chaiAsPromised = require("chai-as-promised"),
  vine = require("../lib/VineSearch.js");

require("mocha-as-promised")();
chai.use(chaiAsPromised);

describe("vine", function() {
  describe("search", function() {
    it("should return a list of tweet/vine (tvine?) objects ", function() {
      var result = vine.search();
      return result.should.eventually.have.length(10);
    });
  });
});