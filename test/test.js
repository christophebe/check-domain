var assert      = require("assert");
var checkDomain = require("../index");


describe('Domain Check', function() {

        it('Check if a domain is not available', function(done) {
            this.timeout(20000);

            checkDomain({domain : "google.com"}, function(error, result) {
                  //console.log(result);
                  assert(result.available == 'NOT-AVAILABLE');
                  done();
            });

        });

        it('Check if a domain is available', function(done) {
            this.timeout(20000);

            checkDomain({domain : "test12345.be"}, function(error, result) {
                //console.log(result);
                assert(result.available == 'AVAILABLE');
                //assert(result.available == 'AVAILABLE');
                done();
            });

        });

        it('Check if a domain is invalid ', function(done) {
            this.timeout(20000);

            checkDomain({domain : "test12345.aaaa"}, function(error, result) {
                //assert(result.available == 'NOT-VALID');
                console.log(result);
                done();
            });

        });

        it('Check if a domain is pending delete ', function(done) {
            this.timeout(20000);

            checkDomain({domain : "durer-longtemps.com"}, function(error, result) {
                assert(result.available == 'PENDING-DELETE');
                //console.log(result);
                done();
            });

        });

});
