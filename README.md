node-vine-search
================

Search for vines through twitter. (Unpolished example of it in use)[http://vinefeed.heroku.com]

Enter some twitter search query like #tags or @user and getting vine information from the results of that query. Returns a Promises/A+ promise using when.js.

Enter a query with the options:
    
    require('vine-search').search({
        query: String = Twitter search query. Default: ""
        retweets: Bool = return retweet results or not. Default: false
        count: Int = Number of results to return. Default: 10
        resultType: String` = Can be either:
            "recent": return only the most recent results in the response. This is the default.
            "mixed": Include both popular and real time results in the response.
            "popular": return only the most popular results in the response.
        maxId: Int = Returns results with an ID less than (that is, older than) or equal to the specified ID. 
        maxRetries: Int = The maximum about of retries. Default: 3
    });

It returns an `object` of strings.

    {  
      user: Twitter username
      id : ID of tweet 
      text : Tweet text
      vineUrl : URL of vine video page
      vidUrl : Direct URL of video (for using your own video solution)
      thumbUrl : Thumbnail of the video 
    }

Unrealistic usage Example:

    function successCallback(results) {
        console.log(results);
    }

    function failCallback(reason) {
        console.error(reason);
    }

    var testSearch = require('vine-search').search({count: 20});
    testSearch.then(successCallback, failCallback)



**TODO:**
* Stream API (should be pretty easy)
* better retry logic for lack of results. Instead of just blank retrying, concatenate results and retry with updated max_id
* add since_id support. 