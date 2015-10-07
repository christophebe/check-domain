var assert      = require("assert");
var checkDomain = require("../index");


describe('Domain Check', function() {

        it('Check if a domain is not available 1', function(done) {
            this.timeout(8000);

            checkDomain({domain : "google.com"}, function(error, result) {
                console.log(result);
                done();
            });

        });

        it('Check if a domain is available 2', function(done) {
            this.timeout(8000);

            checkDomain({domain : "test12345.be"}, function(error, result) {
                console.log(result);
                done();
            });

        });

        it('Check if a domain is available 3', function(done) {
            this.timeout(8000);

            checkDomain({domain : "test12345.aaaa"}, function(error, result) {
                console.log(result);
                done();
            });

        });
});
