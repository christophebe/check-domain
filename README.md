Retrieve informations about one domain:
- IP adress
- DNS resolution
- Ping
- domains on the same ip
- Backlinks, Truts Flow, Citation Flow and other metrics provided by the Majestic API.
- Availability provided by whoisxmlapi.com
- Whois data provided by whoisxmlapi.com + 4 extra info : isValidDomain, isPendingDelete, isRedemptionPeriod, missingData (if no whois found)
- Semrush info (rank, number of organic keywords, organic traffic size : '6070', number of adwords keywords, adwords traffic)
- number of pages indexed by Google (primary & secondary index)

In order to get all info, you need to provide your majestic API key,  your whoisxmlapi credential & your Semrush API key. Without those setting, it returns only dns resolution, ip, ping & indexed pages.

We plan to support other APIs notably for the whois data. Feel free to suggest your favorite ones.


## Install

$ npm install check-domain --save

## Crash course

```javascript
var checkDomain = require("check-domain");

var options = {
  domain : "domainToCheck.com",
  majesticKey : "[add here your majestic key]",
  whois : {user : "[your whoisxmlapi name]", password : "[your whoisxmlapi password]"},
  semrushKey : "[add here your semrush key]",

};

checkDomain(options,
  function(error, result) {
        console.log(result); // see the complete result structure
        console.log(result.isDNSFound);
        console.log(result.ip);
        console.log(result.isAlive);
        console.log(result.isAvailable);
        console.log(result.majestic); // see the json structure provided by http://developer-support.majestic.com/api/commands/get-index-item-info.shtml
        console.log(result.whois);    // see the json structure provided by http://www.whoisxmlapi.com

        console.log(result.semrush); // The Semrush datas

        console.log(result.primaryIndex);
        console.log(result.googleIndex);
        console.log(result.secondaryIndex);


        // We add extra fields in the whois structure
        console.log(result.whois.isValidDomain);
        console.log(result.whois.missingData);  // The whois database doesn't contain info for this domain
        console.log(result.whois.isPendingDelete);
        console.log(result.whois.isRedemptionPeriod);
        console.log(result.whois.createdDate);
        console.log(result.whois.expiresDate);
        console.log(result.whois.expiredWaitingTime);


  });

```

## The complete option list

The options object (see below) can contain the following parameters. Depending your use case, there are some options that can help to avoid an unnecessary cost for some APIs.

- domain : String. The domain to check.
- majesticKey : String. The majestic API key. Optional.
- whois : object {user (String), password (String)}. The Whoisxmlapi credential. Optional.
- semrushKey : String. The semrush API Key. Optional.
- semrushDB : String. If not defined, the semrush DB will match to the domain tld.
- noCheckIfDNSResolve :  Boolean. If true, the API datas (Majestic, Semrush, whois) are not retrieved if there is a correct DNS resolution for this domain.
- minTrustFlow : Number. The minTrustFlow to get the whois, semrush & availability data.
- proxyList : Object. List of proxies to used (see npm module : simple-proxies). Proxies are used only for Google request. Optional.
- googleHost : String. if not defined, the google host will be match to the domain tld or by default google.com. Optional.
- noCheckGoogleIndex : Boolean. If true, the google data (number of indexed pages) are not retrieved.
