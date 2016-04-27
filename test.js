var dns         = require('dns');

dns.lookup("bei.org", function(error, address){



      if (error) {
          console.log("bei.org : Not found");
      }
      else {
          console.log("bei.org : Found");
      }


});


dns.lookup("www.bei.org", function(error, address){



      if (error) {
          console.log("www.bei.org : Not found");
      }
      else {
          console.log("www.bei.org : Found");
      }


});
