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

        it('Check ping & pr for an existing domain', function(done) {
            this.timeout(20000);

            checkDomain({domain : "google.be"}, function(error, result) {

                  assert(result.isAlive);
                  assert(result.pr == 7);
                  done();
            });

        });

        it('Check ping & pr for an non existing domain', function(done) {
            this.timeout(20000);

            checkDomain({domain : "test12345.be"}, function(error, result) {
                assert(! result.isAlive);
                assert(result.pr == -1);
                done();
            });

        });

        it("Check ping, pr & google info for an existing domain", function(done){
            this.timeout(20000);
            checkDomain({domain : "rtbf.be", googleDomain : "google.be"}, function(error, result) {
                //assert(! result.isAlive);
                //assert(result.pr == -1);
                done();
            });
        });
});
