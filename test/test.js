var assert      = require("assert");
var checkDomain = require("../index");


describe('Domain Check', function() {

        it('Check if a domain is not available', function(done) {
            this.timeout(6000);

            checkDomain({domain : "google.com"}, function(error, result) {
                console.log(result);
                done();
            });

        });

        it('Check if a domain is available', function(done) {
            this.timeout(6000);

            checkDomain({domain : "test12345.be"}, function(error, result) {
                console.log(result);
                done();
            });

        });

        it('Check if a domain is available', function(done) {
            this.timeout(6000);

            checkDomain({domain : "test12345.aaaa"}, function(error, result) {
                console.log(result);
                done();
            });

        });
});
