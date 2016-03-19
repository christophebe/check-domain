var assert      = require("assert");
var checkDomain = require("../index");


var NO_DATA_FOUND = "NO-DATA-CHECK-MANUALLY";

var NOT_AVAILABLE_TEXT = "existe déjà";
var NOT_AVAILABLE_STATUS = "NOT-AVAILABLE";

var AVAILABLE_TEXT = "disponible";
var AVAILABLE_STATUS = "AVAILABLE";

var NOT_VALID_TEXT = "invalide";
var NOT_VALID_STATUS = "NOT-VALID";

var PENDING_TEXT = "pendingDelete";
var PENDING_STATUS = "PENDING-DELETE";


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


        // TODO : Add google infos
        it.skip("Check ip & dns & google info for an existing domain", function(done){
            this.timeout(20000);
            checkDomain({domain : "rtbf.be", googleDomain : "google.be"}, function(error, result) {
                //console.log(result);
                //assert(! result.isAlive);
                //assert(result.pr == -1);
                done();
            });
        });
});
