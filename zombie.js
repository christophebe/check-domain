var Browser = require('zombie');


Browser.visit('https://www.ovh.com/fr/cgi-bin/newOrder/order.cgi?domain_domainChooser_domain=durer-longtemps.com', function (error, browser) {

    function pageLoaded(window) {
            if (browser.html("body").indexOf("durer-longtemps.com") > -1) {
              return true;
            }
            else {
              return false;
            }
    }

    browser.wait({function: pageLoaded }, function() {


    })

});
