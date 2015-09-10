var request = require('request');


// HTTP response  will be in french, sorry guys ! :-)
var URL_CHECK_DOMAIN_OVH = "https://www.ovh.com/fr/cgi-bin/newOrder/order.cgi";
var HTTP_PARAM_DOMAIN = "domain_domainChooser_domain";


var checkDomain = function (domain, callback) {

    var options = {
      uri : URL_CHECK_DOMAIN_OVH,
      qs : {
        HTTP_PARAM_DOMAIN : domain
      }
    };

    request(options, function (error, response, body) {
        if (error) {
          return callback(error);
        }

        if (response.statusCode != 200) {
          return callback(new Error("Invalid Response - Http code : " + response.statusCode ));
        }

        buildResult(body, callback);

    });
}

function buildResult(body, callback) {
    console.log(body);

    var result = {availability : false};
    callback(null, result);
}

module.exports.checkDomain = checkDomain;
