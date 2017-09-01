/* This dialog is responsible for welcoming the user when he arrives
 * for the first time*/

var builder = require('botbuilder');

var lib = new builder.Library('firstRun');


lib.dialog('/', [
  function (session) {
    session.send("Hello, I'm Nutribot !");
    session.sendTyping(300);
    session.send("My purpose is to help you understand your eating habits.");
    session.send("I work by analysing your meals so I will eventualy need you "+
                 "to tell me what you eat.");
    session.userData.address = session.message.address;
    session.userData.canBeInterrupted = true;
    session.userData.isFisrtRun = false;
  }
]);

module.exports.createLibrary = function () {
  return lib.clone();
};
