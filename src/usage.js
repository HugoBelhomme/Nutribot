/* The point of this dialog is to give the user a brief understanding
 * of the bot
 */

var builder = require('botbuilder');

var lib = new builder.Library('usage');


lib.dialog('showUsage', [
  function (session) {
    session.endDialog(
      "I'm a meal coach, the aim is that you tell me what you eat and "
      +"I tell you what I think about it."
      +"You can navigate by telling me what you want and "
      +"I'll do my best to understand you."
      +"\nYou can also choose to click on the buttons if you prefer.");
  }
]);

module.exports.createLibrary = function () {
  return lib.clone();
};
