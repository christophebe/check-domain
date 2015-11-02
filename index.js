var events      = require('events');
var util        = require("util");
var _           = require("underscore");
var async       = require("async");
var getPageRank = require('pagerank');
var request     = require('request');
var ping        = require('ping');
var moment      = require('moment');
var log         = require('crawler-ninja-logger').Logger;



var URL_WHOIS = "https://www.whoisxmlapi.com/whoisserver/WhoisService";
var URL_MAJESTIC_GET_INFO = "http://api.majestic.com/api/json";

var PARAM_COMMAND_AVAILABLE = "GET_DN_AVAILABILITY";

var PENDING_DELETE = "redemptionPeriod";
var INVALID_DOMAIN_MESSAGE = "Unable to retrieve whois record for";
var MISSING_WHOIS_DATA_MESSAGE = "MISSING_WHOIS_DATA";

//var URL_GOOGLE_SITE = "/search?q=site:";


/**
 * Check informations on a domain
 * - Ping
 * - Page Rank
 * - Backlinks, Truts Flow provided by the Majestic API
 * - Availability provided by whoisxmlapi.com
 * - Whois provided by whoisxmlapi.com
 * - Check if indexed by Google (primary & secondary index)
 *
 * @param a json object {domain, majecticKey, whois : {user, password}},
          The majesticKey is optional
          The whois is also optional. It match to whoisxmlapi.com API credential
 * @param callback(error, result). The result is a json object containing the following attributes :
 *  - domain,
 *  - isAlive,
 *  - pr,
 *  - majestic (matching to the json result provided by the Majestic method GetIndexItemInfo  : DataTables.Results.Data[0]),
 *  - available(true or false)
 *  - whois (matching to the json structure provided by the whoisxmlapi).
 *     for reasons of ease, it contains also 3 extras attributes :
 *     missingData : if true, there is no whois date for this domain
 *     isValidDomain : the domain name is not valid
 *     isPendingDelete : true if the domain is pending delete
 *     createdDate
 *     expiresDate
 *     expiredWaitingTime
 */
module.exports = function (params, callback) {

    async.parallel([
      async.apply(getPing,params),
      async.apply(getPr, params),
      async.apply(getMajesticInfo, params),
      async.apply(getWhoisData, params, PARAM_COMMAND_AVAILABLE), // Get availability
      async.apply(getWhoisData, params, null) // Get whois

      //,
      //async.apply(getGoogleInfo, params),

    ], function(error, results){
        if (error) {
          return callback(error);
        }

        var data = {
          domain : params.domain,
          isAlive : results[0]
        };

        if (results[1]) {
          data.pr = results[1];
        }
        else {
          data.pr = -1;
        }

        if (results[2]) {

          data.majestic = results[2];
        }

        if (results[3]) {
          if (results[3].DomainInfo) {
              data.available = results[3].DomainInfo.domainAvailability;
          }
          else {
              data.available = "no-data";
          }

        }

        if (results[4]) {
          data.whois = results[4];
        }

        callback(null, data);
    });
}

function getPing(params, callback) {
  ping.sys.probe(params.domain, function(isAlive){
      callback(null, isAlive);
  });

}

function getWhoisData(params, command, callback) {

  if (params.whois && params.whois.user && params.whois.password) {
      log.debug({"url" : params.domain, "step" : "check-domain.getWhoisData", "message" : "Get whoisxmlapi data with user : " + params.whois.user});

      var query = {
          url : URL_WHOIS,
          qs : {
            username : params.whois.user,
            password : params.whois.password,
            domainName : params.domain,
            outputFormat : "JSON"
          }
      }

      // TODO : review this code ?
      // Support only the commande GET_DN_AVAILABILITY
      if (command) {
        query.qs.cmd = command;
        query.qs.getMode = "DNS_AND_WHOIS";
      }

      request(query, function (error, response, body) {
          if (error) {
            log.error({"url" : params.domain, "step" : "check-domain.getWhoisData", "message" : "whoisxmlapi request error", "options" : error});
            return callback(error);
          }
          if (response.statusCode == 200) {
            log.debug({"url" : params.domain, "step" : "check-domain.getWhoisData", "message" : "Whoisxmlapi info retrieved correclty"});
            var info = JSON.parse(body);

            // Check if the domains is valid
            if (info.ErrorMessage && info.ErrorMessage.msg.indexOf(INVALID_DOMAIN_MESSAGE) > -1) {
              info.isValidDomain = false;
            }
            else {
              info.isValidDomain = true;
            }

            // Check if there a whois data for this domain
            if (info.WhoisRecord && info.WhoisRecord.dataError && info.WhoisRecord.dataError == MISSING_WHOIS_DATA_MESSAGE) {
              info.missingData = true;
            }
            else {
              info.missingData = false;
            }

            // Check is the domain is pending deleted
            if (! command && info.WhoisRecord && info.WhoisRecord.registryData && info.WhoisRecord.registryData.status) {

                info.isPendingDelete = info.WhoisRecord.registryData.status.indexOf(PENDING_DELETE) > -1;
            }
            else {
              info.isPendingDelete = false;
            }

            // Check created date
            if (! command && info.WhoisRecord && info.WhoisRecord.createdDate) {
              info.createdDate = info.WhoisRecord.createdDate;
            }
            else {
              info.createdDate = 'no-data';
            }

            // Check expires date
            if (! command && info.WhoisRecord && info.WhoisRecord.expiresDate ) {
              info.expiresDate = info.WhoisRecord.expiresDate;
              info.expiredWaitingTime = moment(info.WhoisRecord.expiresDate, moment.ISO_8601).fromNow();
            }
            else {
              info.expiresDate = 'no-data';
              info.expiredWaitingTime = 'no-data';
            }

            // Check domain age
            if (! command && info.WhoisRecord && info.WhoisRecord.estimatedDomainAge ) {
              info.estimatedDomainAge = (info.WhoisRecord.estimatedDomainAge / 365).toFixed(2);
            }
            else {
              info.expiresDate = 'no-data';
            }

            return callback(null, info);
          }
          else {

            log.error({"url" : params.domain, "step" : "check-domain.getWhoisData", "message" : "Whoisxmlapi request error", "options" : response.statusCode});
            callback(new Error("Impossible to get the Whoisxmlapi data, check your credential !"));
          }
      });
  }
  else {
    callback();
  }

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




function getMajesticInfo(params, callback) {
    if (params.majecticKey) {
        log.debug({"url" : params.domain, "step" : "check-domain.getMajesticInfo", "message" : "Get Majectic Info with the key : " + params.majecticKey});

        var query = {
           url : URL_MAJESTIC_GET_INFO,
           qs : {
             cmd : "GetIndexItemInfo",
             datasource : "fresh",
             app_api_key : params.majecticKey,
             items : 1,
             item0 : params.domain
           }
        }

        request(query, function (error, response, body) {
            if (error) {
              log.error({"url" : params.domain, "step" : "check-domain.getMajesticInfo", "message" : "Majestic request error", "options" : error.message});
              return callback(error);
            }

            if (response.statusCode == 200) {
              log.debug({"url" : params.domain, "step" : "check-domain.getMajesticInfo", "message" : "Majectic info retrieved correclty"});

              var info = JSON.parse(body);

              callback(null, info.DataTables.Results.Data[0]);
            }
            else {

              log.error({"url" : params.domain, "step" : "check-domain.getMajesticInfo", "message" : "Majestic request error", "options" : response.statusCode});
              callback(new Error("Impossible to get the Majestic data, check your credential"));
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
