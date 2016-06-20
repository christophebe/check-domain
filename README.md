Retrieve informations about one domain:
- IP adress
- DNS resolution
- Ping
- domains on the same ip
- Backlinks, Truts Flow, Citation Flow and other metrics provided by the Majestic API
- Availability provided by whoisxmlapi.com
- Whois data provided by whoisxmlapi.com + 4 extra info : isValidDomain, isPendingDelete, isRedemptionPeriod, missingData (if no whois found)
- Semrush info (rank, number of organic keywords, organic traffic size : '6070', number of adwords keywords, adwords traffic)
- number of pages indexed by Google (primary & secondary index)

In order to get all info, you need to provide your majestic API key,  your whoisxmlapi credential & your Semrush API key. Without those setting, it returns only dns, ip, ping & indexed pages.

Install this module in your node project
----------------------------------------
$ npm install check-domain --save

Crash course
------------


```javascript
var checkDomain = require("check-domain");


checkDomain(
  {
    domain : "domainToCheck.com",
    host : "google.fr", // the google tld used to check the indexed pages

    // Optional 
    majecticKey : "[add here your majestic key]",
    whois : {user : "[your whoisxmlapi name]", password : "[your whoisxmlapi password]"},
    semrushKey : "[add here your semrush key]",
    semrushDB : "fr",


    //Optional
    noCheckIfDNSResolve : true, // if true, the majestic & the whois data are not retrieved if there is a correct DNS resolved
    minTrustFlow : 35 // the min trustflow value required to retrieve availability, whois data and the Semrush data

  },
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
