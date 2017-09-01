var builder = require('botbuilder');

var lib = new builder.Library('menu');


lib.dialog('showMenu', [
  function (session) {
    builder.Prompts.choice(session,
      "This is the menu, please pick an option",
      'Usage|Reminders|Recap|Params',
      {
        listStyle: builder.ListStyle.button,
        retryPrompt: "I'm sorry, I need you to pick a valid option !",
        maxRetries: 0
      }
    );
  },
  function (session, results, next) {
    if (results.response) {
      // The options are disabled because Luis.ai already understands the intent
      // and it would mess stuff up.
      switch (results.response.index) {
        case 0:
          //session.beginDialog("usage:showUsage");
          break;
        case 1:
          //session.beginDialog("reminders:/");
          break;
        case 2:
          //session.beginDialog("recap:showRecap");
          break;
        case 3:
          session.beginDialog("params:showParams");
          break;
        default:
          //session.beginDialog('default:/');
          break;
      }
    } else {
      next();
    }
  }
]);

// Importing the libs
lib.library(require('./paramshandler').createLibrary());

module.exports.createLibrary = function () {
  return lib.clone();
};
