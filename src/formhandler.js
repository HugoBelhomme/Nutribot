/* These dialogs are responsible for getting informations about the user */

var builder = require('botbuilder');
var w2n = require ('words-to-numbers');
var config = require('./config.js')

var MongoClient = require('mongodb').MongoClient;
var url = config.MONGOURL;

var lib = new builder.Library('form');

// Minimal number of hours between two prompts for the form
var nbHours = 0.5; // (0.04 = 2min4s)

lib.dialog('preForm', [
  function(session) {
    // If it has already been filled, end the dialog and display the menu
    var currentTime = new Date();
    var lastTime = new Date(session.userData.lastForm);
    lastTime.setTime(lastTime.getTime() + nbHours * 3600000);

    if ((session.userData.version && session.userData.version > 0.0) || lastTime > currentTime) {
      session.endDialog();
    } else {
      session.beginDialog('askForConsent');
    }
  }
])

lib.dialog('askForConsent', [
  function(session) {
    session.send("If you don't mind I'd like to get to know you better"
                +" with those few questions.");
    var prompt = "I assure you I won't share them with anyone and "
                +"you'll always be able to make me delete them";
    builder.Prompts.choice(
      session,
      prompt,
      "Ok|Not now",
      {
        listStyle: builder.ListStyle.button,
        retryPrompt: "That's not a valid option !",
        maxRetries: 0
      }
    );
  },
  function (session, results) {
    // If the user agrees
    if (results.response && results.response.index == 0) {
      session.replaceDialog('form:form');
    } else {
      session.userData.lastForm = new Date();
      session.endDialog("Ok no worries, we'll talk about that later.");
    }
  }
]);

lib.dialog('form', [
  function (session, args) {
    // Save previous state (create on first call)
    session.dialogData.index = args ? args.index : 0;
    session.dialogData.form = args ? args.form : {};

    // Prompt user for next field
    builder.Prompts.text(session,
                        questions[session.dialogData.index].prompt,
                        {
                          retryPrompt: ""
                        }
                        );
  },
  function (session, results) {
    var field = questions[session.dialogData.index++].field;
    session.dialogData.form[field] = w2n.wordsToNumbers(results.response);

    // Check for end of form
    if (session.dialogData.index >= questions.length) {
        // If the form is over : raise the flag
        session.userData.version = 1.0;

        var msgThx = "Thank you, I'll keep this in mind and "
                    +"use it to better help you";
        session.send(msgThx);
        // Return completed form
        session.userData.form = session.dialogData.form;
        processForm(session.dialogData.form, session.userData.userId);
        session.endDialogWithResult({ response: session.dialogData.form });
    } else {
        // Next field
        session.replaceDialog('form', session.dialogData);
    }
  }
]);

processForm = function (resForm, id) {
  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    resForm.userId = id;
    db.collection("users").insertOne(resForm, function (err, res) {
      if (err) throw err;
      console.log("L'utilisateur suivant a été rajouté à la base de données:");
      console.log(res.ops);
    })
  })
};


var questions = [
  { field: 'name', prompt: "What's your name ?"},
  { field: 'age', prompt: "How old are you ?"},
  { field: 'height', prompt: "How tall are you ? (in m)"},
  { field: 'weight', prompt: "How much do you weight ? (in kg)"}
];

module.exports.createLibrary = function () {
  return lib.clone();
};
