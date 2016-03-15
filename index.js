var events      = require('events');
var dns         = require('dns');
var util        = require("util");
var async       = require("async");
var request     = require('request');
var ping        = require('ping');
var moment      = require('moment');
var log         = require('crawler-ninja-logger').Logger;



var URL_WHOIS = "https://www.whoisxmlapi.com/whoisserver/WhoisService";
var URL_MAJESTIC_GET_INFO = "http://api.majestic.com/api/json";

var PARAM_COMMAND_AVAILABLE = "GET_DN_AVAILABILITY";

var REDEMPTION_PERIOD = "redemptionPeriod";
var PENDING_DELETE = "pendingDelete";
var INVALID_DOMAIN_MESSAGE = "Unable to retrieve whois record for";
var MISSING_WHOIS_DATA_MESSAGE = "MISSING_WHOIS_DATA";

var URL_GOOGLE_SITE = "/search?q=site:";


/**
 * Check informations on a domain
 * - DNS resolve
 * - Ping
 * - Backlinks, Truts Flow provided by the Majestic API
 * - Availability provided by whoisxmlapi.com
 * - Whois provided by whoisxmlapi.com
 * - Check if indexed by Google (primary & secondary index)
 *
 * @param a json object {domain, majecticKey, whois : {user, password}, checkIfAlive, minTrustFlow},
          The majesticKey is optional
          The whois is also optional. It match to whoisxmlapi.com API credential
          noCheckIfDNSResolve : if true, the availability & the complete whois data is not retrieved if there is a correct DNS resolve (default false)
          minTrustFlow : the min trustflow value required to retrieve availability and whois data
 * @param callback(error, result). The result is a json object containing the following attributes :
 *  - domain,
 *  - isDNSFound,
 *  - ips : list IPS({adress, isAlive}) used for this domain,
 *  - majestic (matching to the json result provided by the Majestic method GetIndexItemInfo  : DataTables.Results.Data[0]),
 *  - isAvailable(true or false)
 *  - whois (matching to the json structure provided by the whoisxmlapi).
 *     for reasons of simplicity, it contains also extras attributes :
 *     missingData : if true, there is no whois date for this domain
 *     isValidDomain : the domain name is not valid
 *     isPendingDelete : true if the domain is pending delete
 *     isRedemptionPeriod : True id the domain is in redemption period
 *     redemptionPeriod
 *     createdDate
 *     expiresDate
 *     expiredWaitingTime
 */
module.exports = function (params, endCallback) {

  async.waterfall([
      function(callback) {
          getIp(params, callback);
      },
      function(data, callback) {
          getPing(data, callback);
      },
      function(data, callback) {
          getMajesticData(data, params, callback);
      },
      function(data, callback) {
          getOtherMetrics(data, params, callback);
      }
  ], function (error, data) {
      endCallback(error, data);
  });
};

function getIp(params, callback) {

    dns.lookup(params.domain, function(error, address){

          var data = {domain : params.domain};

          if (error) {
              data.isDNSFound = false;
          }
          else {
              data.isDNSFound = true;
              data.ip = address;
          }

          callback(null, data);
    });
}


function getPing(dnsInfo, callback) {

    if (! dnsInfo.isDNSFound) {
        dnsInfo.isAlive = false;
        return callback(null, dnsInfo);
    }

    ping.sys.probe(dnsInfo.ip, function(isAlive){
            dnsInfo.isAlive = isAlive;
            callback(null, dnsInfo);
    });

}

function getOtherMetrics(generalInfo, params, callback) {
  async.parallel([
    async.apply(getWhoisData, generalInfo, params)

    // In progress ...
    //async.apply(getGoogleInfo, params)

  ], function(error, results){
      if (error) {
        return callback(error);
      }

      var data = generalInfo;

      if (results[0]) {
        data.whois = results[0];
      }

      if (results[0]) {
        if (data.isDNSFound) {
          data.isAvailable = false;
        }
        else {
          if (data.whois && data.whois.status) {
            data.isAvailable = (data.whois.status === "AVAILABLE");
          }
          else {
            data.isAvailable = false;
          }

        }

      }

      callback(null, data);
  });

}


function getWhoisData(generalInfo, params, callback) {


  if (params.noCheckIfDNSResolve && generalInfo.isDNSFound) {
      var result = emptyWhoisData();
      return callback(null, result);
  }

  if (params.minTrustFlow && generalInfo.majestic.TrustFlow < params.minTrustFlow) {
      var result = emptyWhoisData();
      return callback(null, result);
  }

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
      };

      query.qs.getMode = "DNS_AND_WHOIS";

      request(query, function (error, response, body) {
          if (error) {
            log.error({"url" : params.domain, "step" : "check-domain.getWhoisData", "message" : "whoisxmlapi request error", "options" : error});
            return callback(error);
          }
          if (response.statusCode === 200) {
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
            if (info.WhoisRecord && info.WhoisRecord.dataError && info.WhoisRecord.dataError === MISSING_WHOIS_DATA_MESSAGE) {
              info.missingData = true;
            }
            else {
              info.missingData = false;
            }

            // Check is the domain is pending deleted
            if (info.WhoisRecord && info.WhoisRecord.registryData && info.WhoisRecord.registryData.status) {
                info.status = info.WhoisRecord.registryData.status;
                info.isPendingDelete = info.WhoisRecord.registryData.status.indexOf(PENDING_DELETE) > -1;
                info.isRedemptionPeriod = info.WhoisRecord.registryData.status.indexOf(REDEMPTION_PERIOD) > -1;
            }
            else {
              info.isPendingDelete = 'no-data';
              info.isRedemptionPeriod = 'no-data';
            }

            // Check created date
            if (info.WhoisRecord && info.WhoisRecord.createdDate) {
              info.createdDate = info.WhoisRecord.createdDate;
            }
            else {
              info.createdDate = 'no-data';
            }

            // Check expires date
            if (info.WhoisRecord && info.WhoisRecord.expiresDate ) {
              info.expiresDate = info.WhoisRecord.expiresDate;
              info.expiredWaitingTime = moment(info.WhoisRecord.expiresDate, moment.ISO_8601).fromNow();
            }
            else {
              info.expiresDate = 'no-data';
              info.expiredWaitingTime = 'no-data';
            }

            // Check domain age
            if (info.WhoisRecord && info.WhoisRecord.estimatedDomainAge ) {
              info.estimatedDomainAge = (info.WhoisRecord.estimatedDomainAge / 365).toFixed(2);
            }
            else {
              info.estimatedDomainAge = 'no-data';
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
    callback(null, emptyWhoisData());
  }

}

function getMajesticData(generalInfo, params, callback) {
    if (params.majecticKey) {
        log.debug({"url" : params.domain, "step" : "check-domain.getMajesticData", "message" : "Get Majectic Info with the key : " + params.majecticKey});

        var query = {
           url : URL_MAJESTIC_GET_INFO,
           qs : {
             cmd : "GetIndexItemInfo",
             datasource : "fresh",
             app_api_key : params.majecticKey,
             items : 1,
             item0 : params.domain
           }
        };

        request(query, function (error, response, body) {
            if (error) {
              log.error({"url" : params.domain, "step" : "check-domain.getMajesticData", "message" : "Majestic request error", "options" : error.message});
              return callback(error);
            }

            if (response.statusCode === 200) {
              log.debug({"url" : params.domain, "step" : "check-domain.getMajesticData", "message" : "Majectic info retrieved correclty"});

              var info = JSON.parse(body);
              generalInfo.majestic = info.DataTables.Results.Data[0];
              callback(null, generalInfo);
            }
            else {

              log.error({"url" : params.domain, "step" : "check-domain.getMajesticData", "message" : "Majestic request error", "options" : response.statusCode});
              callback(new Error("Impossible to get the Majestic data, check your credential"));
            }
        });
    }
    else {
      generalInfo.majestic = {"TrustFlow" : 0, "ResultCode" : "NO-MAJESTIC-KEY"}; //Dummy json if there is no majesticKey
      callback(null, generalInfo);
    }
}

/*
function getGoogleInfo(params, callback) {

  if (params.googleDomain) {
      log.debug({"url" : params.domain, "step" : "check-domain.getGoogleInfo", "message" : "Get Google Info on : " + params.googleDomain});

      var googleUrl = "https://www." + params.googleDomain + URL_GOOGLE_SITE + params.domain;
      request(googleUrl, function (error, response, body) {
          if (error) {
            console.log(error);
            log.error({"url" : params.domain, "step" : "check-domain.getGoogleInfo", "message" : "google request error", "options" : error.message});
            return callback(null, {});
          }

          if (response.statusCode == 200) {
            log.debug({"url" : params.domain, "step" : "check-domain.getGoogleInfo", "message" : "Google info retrieve with status : " + response.statusCode});
            console.log(body);
            callback(null, {});
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
*/

function emptyWhoisData() {
  return {
      missingData : "true",
      isValidDomain : "no-data",
      isPendingDelete : "no-data",
      isRedemptionPeriod : "no-data",
      createdDate : 'no-data',
      expiresDate : 'no-data',
      expiredWaitingTime : 'no-data',
      estimatedDomainAge : 'no-data'
  };
}
