var events  = require('events');
var util    = require("util");
var Browser = require('zombie');
var whois = require('node-whois');


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


function DomainChecker(proxyList) {
    events.EventEmitter.call(this);
    if (proxyList) {
      this.proxyList = proxyList;
    }

}

util.inherits(DomainChecker, events.EventEmitter);

DomainChecker.prototype.check = function(domain) {

    var self = this;

    whois.lookup(domain, function(error, data) {
        console.log("whois", data);
        self.checkOnOvh(domain, {domain : domain, whois : data});
    });

}
DomainChecker.prototype.checkOnOvh = function(params) {

    var url = URL_CHECK_DOMAIN_OVH + "?" + HTTP_PARAM_DOMAIN + "=" + params.domain;

    var browser = new Browser();
    if (this.proxyList) {
      browser.proxy = this.options.proxyList.getProxy().getUrl();
    }

    var self = this;

    browser.fetch(url)
      .then(function(response) {
        if (response.status === 200)
          return response.text();
      })
      .then(function(body) {
        params.ovhStatus = buildOVHResult(body);
        self.emit("end", params);

      })
      .catch(function(error) {
        //callback(error);
      });
}

var buildOVHResult = function (body) {

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


module.exports.DomainChecker = DomainChecker;
