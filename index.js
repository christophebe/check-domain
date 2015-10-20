var events      = require('events');
var util        = require("util");
var async       = require("async");
var Browser     = require('zombie');
var getPageRank = require('pagerank');
var request     = require('request');
var ping        = require('ping');
var whois       = require('node-whois');
var log         = require('crawler-ninja-logger').Logger;


var URL_MAJESTIC_GET_INFO = "http://api.majestic.com/api/json?cmd=GetIndexItemInfo&items=1&item0=";
var PARAMS_MAJESTIC_KEY = "&datasource=fresh&app_api_key=";

var URL_GOOGLE_SITE = "/search?q=site:";

// HTTP response  will be in french, sorry guys ! :-)
// TODO : need another site to check domain availability
var URL_CHECK_DOMAIN_OVH = "https://www.ovh.com/fr/cgi-bin/newOrder/order.cgi";
var HTTP_PARAM_DOMAIN = "domain_domainChooser_domain";

var NO_DATA_FOUND = "NO-DATA-CHECK-MANUALLY";

var NOT_AVAILABLE_TEXT = "existe déjà";
var NOT_AVAILABLE_STATUS = "NOT-AVAILABLE";

var AVAILABLE_TEXT = "disponible";
var AVAILABLE_STATUS = "AVAILABLE";

var NOT_VALID_TEXT = "invalide";
var NOT_VALID_STATUS = "NOT-VALID";

var PENDING_TEXT = "pendingDelete";
var PENDING_STATUS = "PENDING-DELETE";

/**
 * Check informations on a domain
 * - whois
 * - Page Rank
 * - Check if indexed by Google (primary & secondary index)
 * - Backlinks, Truts Flow provided by the Majestic API
 * - Availability
 *
 * @param a json object {domain, majecticKey}, the majesticKey is optional
 * @param callback(error, result). The result is a json object containing the following attributes :
 *  - domain,
 *  - whois,
 *  - pr,
 *  - majestic (matching to the json result provided by the Majestic method GetIndexItemInfo  : DataTables.Results.Data[0])
 *  - available (boolean)
 *
 */
module.exports = function (params, callback) {

    async.parallel([
      async.apply(getAvailability, params),
      async.apply(getWhois, params),
      async.apply(getPr, params),
      async.apply(getMajesticInfo, params)
      //,
      //async.apply(getGoogleInfo, params),

    ], function(error, results){
        if (error) {
          return endCallback(error);
        }
        var data = {
          domain : params.domain,
          available : results[0],
          whois : getWhoisValues(results[1]),
          pr : results[2],
          majestic : results[3]
          //,
          //googleInfo : results[4]

        };
        callback(null, data);
    });
}

function getWhois(params, callback) {

    whois.lookup(params.domain, function(error, result){
        if (error) {
          log.error({"url" : params.domain, "step" : "check-domain.whois", "message" : "whois error", "options" : error.message});
          callback(null, "noresult");
        }
        else {
          log.debug({"url" : params.domain, "step" : "check-domain.whois", "message" : "whois retrieved correclty"});
          callback(null, result);
        }
    });

}

function getPr(params, callback) {
    getPageRank(params.domain, function(error, result){
      if (error) {
        log.error({"url" : params.domain, "step" : "check-domain.pageRank", "message" : "pageRank error", "options" : error.message});
        callback(null, -1);
      }
      else {
        log.debug({"url" : params.domain, "step" : "check-domain.pageRank", "message" : "pagerank retrieved correclty"});
        callback(null, result);
      }
    });
}

function getAvailability(params, endCallback) {

    async.waterfall([
        function(callback) {
            ping.sys.probe(params.domain, function(isAlive){
                callback(null, isAlive);
            });

        },
        function(isAlive, callback) {
            if (isAlive) {
              return callback(null, NOT_AVAILABLE_STATUS);
            }

            // If the site is not alive (check by ping), we check its availability on ovh.com
            browseOVH(params, function(error, result){
              if (error) {
                log.error({"url" : params.domain, "step" : "check-domain.checkOnOvh", "message" : "checkOnOvh error", "options" : error.message});
                callback(null, NO_DATA_FOUND);
              }
              else {
                log.debug({"url" : params.domain, "step" : "check-domain.checkOnOvh", "message" : "checkOnOvh retrieved correclty"});
                callback(null, result);
              }
            });
        }
    ], function (error, result) {
      endCallback(null, result);
    });

}

function getWhoisValues(whois) {
    var values = [];
    var lines =  whois.split('\r\n');
    lines.forEach(function(line) {
        var v = line.split(": ");
        values[v[0]] = v[1];
    });

    return values;
}

function browseOVH(params, callback) {

    var url = URL_CHECK_DOMAIN_OVH + "?" + HTTP_PARAM_DOMAIN + "=" + params.domain;

    // The domain chekcer page on ovh is dynamic, that's why we are using zombie browser
    var browser = new Browser({maxWait: 20000,loadCSS: false});

    browser.visit(url, function (error) {

        function pageLoaded(window) {
                if (browser.html("body").indexOf(param.domain) > -1) {
                  return true;
                }
                else {
                  return false;
                }
        }

        browser.wait({function: pageLoaded }, function() {
            var body = browser.html("body")
            callback(null, buildOVHResult(body));

        })

    });
}

function buildOVHResult(body) {
    //console.log(body);
    if (body.indexOf(PENDING_TEXT) > -1) {
      return PENDING_STATUS;
    }

    if (body.indexOf(NOT_VALID_TEXT) > -1) {
      return status = NOT_VALID_STATUS;
    }

    if (body.indexOf(NOT_AVAILABLE_TEXT) > -1) {
      return NOT_AVAILABLE_STATUS;
    }

    if (body.indexOf(AVAILABLE_TEXT) > -1) {
      return status = AVAILABLE_STATUS;
    }

    return NO_DATA_FOUND;

}

function getMajesticInfo(params, callback) {
    if (params.majecticKey) {
        log.debug({"url" : params.domain, "step" : "check-domain.getMajesticInfo", "message" : "Get Majectic Info with the key : " + params.majecticKey});

        var majesticURL = URL_MAJESTIC_GET_INFO + params.domain +  PARAMS_MAJESTIC_KEY + params.majecticKey;
        request(majesticURL, function (error, response, body) {
            if (error) {
              log.error({"url" : params.domain, "step" : "check-domain.getMajesticInfo", "message" : "Majestic request error", "options" : error.message});
              return callback(null, {});
            }

            if (response.statusCode == 200) {
              log.debug({"url" : params.domain, "step" : "check-domain.getMajesticInfo", "message" : "Majectic info retrieved correclty"});
              var info = JSON.parse(body);

              callback(null, info.DataTables.Results.Data[0]);
            }
            else {

              log.error({"url" : params.domain, "step" : "check-domain.getMajesticInfo", "message" : "majestif request error", "options" : response.statusCode});
              callback(null, {});
            }
        });
    }
    else {
      callback();
    }
}


function getGoogleInfo(params, callback) {

  if (params.googleDomain) {
      log.debug({"url" : params.domain, "step" : "check-domain.getGoogleInfo", "message" : "Get Google Info on : " + params.googleDomain});

      var googleUrl = "https://wwww." + googleDomain + URL_GOOGLE_SITE + params.domain;
      request(googleUrl, function (error, response, body) {
          if (error) {
            log.error({"url" : params.domain, "step" : "check-domain.getGoogleInfo", "message" : "google request error", "options" : error.message});
            return callback(null, {});
          }

          if (response.statusCode == 200) {
            log.debug({"url" : params.domain, "step" : "check-domain.getGoogleInfo", "message" : "Google info retrieve with status : " + response.statusCode});
            //var info = JSON.parse(body);
            //callback(null, info.DataTables.Results.Data[0]);
          }
          else {
            log.error({"url" : params.domain, "step" : "check-domain.getGoogleInfo", "message" : "majestif request error", "options" : response.statusCode});
            callback(null, {});
          }
      });
  }
  else {
    callback();
  }
}
