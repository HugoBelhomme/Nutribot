/* This dialog is used as a backup dialog in different situations where the user
 * has to chose a dialog */

var builder = require('botbuilder');

var lib = new builder.Library('default');


lib.dialog('/', [
  function(session) {
    session.send("Sorry I did not get that, let me display you the menu.");
    session.beginDialog('menu:showMenu');
  }
]);

module.exports.createLibrary = function () {
  return lib.clone();
};
