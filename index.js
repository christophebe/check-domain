var events      = require('events');
var util        = require("util");
var async       = require("async");
var Browser     = require('zombie');
var whois       = require('node-whois');
var getPageRank = require('pagerank');
var log         = require('crawler-ninja-logger').Logger;


// HTTP response  will be in french, sorry guys ! :-)
var URL_CHECK_DOMAIN_OVH = "https://www.ovh.com/fr/cgi-bin/newOrder/order.cgi";
var HTTP_PARAM_DOMAIN = "domain_domainChooser_domain";
var NO_DATA_FOUND = "";

var NOT_AVAILABLE_TEXT = "n'est pas disponible à l'enregistrement";
var NOT_AVAILABLE_STATUS = "NOT-AVAILABLE";

var AVAILABLE_TEXT = "est disponible";
var AVAILABLE_STATUS = "AVAILABLE";

var NOT_VALID_TEXT = "Nom de domaine invalide";
var NOT_VALID_STATUS = "NOT-VALID";

var NOT_VALID_TEXT = "pending delete";
var NOT_VALID_STATUS = "NOT-VALID";


module.exports = function (params, callback) {

    // if one error occurs, don't propagate it
    // otherwise the complete parallel process will be on error
    async.parallel([
      function(callback){
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
      },
      function(callback) {
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
      },
      function(callback) {
          checkOnOvh(params.domain, function(error, result){
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

    ], function(error, results){
        if (error) {
          return callback(error);
        }
        var data = { domain : params.domain, whois : getWhoisValues(results[0]), pr : results[1], available : results[2] };
        callback (null, data);
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

function checkOnOvh(params, callback) {

    var url = URL_CHECK_DOMAIN_OVH + "?" + HTTP_PARAM_DOMAIN + "=" + params.domain;

    var browser = new Browser();
    if (params.proxy) {
      browser.proxy = params.proxy
    }

    browser.fetch(url)
      .then(function(response) {
        if (response.status === 200)
          return response.text();
      })
      .then(function(body) {
        callback(null, buildOVHResult(body));

      })
      .catch(function(error) {
        callback(error);
      });
}

function buildOVHResult (body) {

  var status = NO_DATA_FOUND;
  if (body.indexOf(NOT_AVAILABLE_TEXT) > -1) {
    status = NOT_AVAILABLE_STATUS;
  }

  if (body.indexOf(AVAILABLE_TEXT) > -1) {
    status = AVAILABLE_STATUS;
  }

  if (body.indexOf(NOT_VALID_TEXT) > -1) {
    status = NOT_VALID_STATUS;
  }

  return status;

}
