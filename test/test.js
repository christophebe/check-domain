var assert      = require("assert");
var checkDomain = require("../index");


describe('Domain Check', function() {

        it('Check ip & dns for an existing domain', function(done) {
            this.timeout(20000);

            checkDomain({domain : "google.be"}, function(error, result) {
                  //console.log(result);
                  assert(result.isAlive);
                  assert(result.isDNSFound);
                  assert(! result.isAvailable);

                  done();
            });

        });

        it('Check ip & dns for an non existing domain', function(done) {
            this.timeout(20000);

            checkDomain({domain : "test12345.be"}, function(error, result) {
                //console.log(result);
                assert(! result.isAlive);
                assert(! result.isDNSFound);


                //assert(result.pr === -1);
                done();
            });

        });

        it('Check ip & dns for an non existing domain', function(done) {
            this.timeout(20000);

            checkDomain({domain : "test12345.be"}, function(error, result) {
                //console.log(result);
                assert(! result.isAlive);
                assert(! result.isDNSFound);


                //assert(result.pr === -1);
                done();
            });

        });

        it('Check ip & dns for a domain only available on www', function(done) {
            this.timeout(20000);

            checkDomain({domain : "bei.org"}, function(error, result) {
                //console.log(result);
                //assert(! result.isAlive);
                assert(result.isDNSFound);


                //assert(result.pr === -1);
                done();
            });

        });


});
