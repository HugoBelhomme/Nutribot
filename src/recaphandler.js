/* This dialog is responsible for preparing and displaying the recaps,
 * right now theses recaps include displaying the meals and calculating the
 * nutritional intake of a whole day */

var builder = require('botbuilder');
var tools = require('./tools.js')
var fs = require('fs');
var pluralize = require('pluralize');

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/testsMongo";

var db;
MongoClient.connect(url, null, function (err, bdd) {
  if (err) {
    throw err;
    console.log(err);
  }
  db = bdd;
});


var lib = new builder.Library('recap');


lib.dialog('showRecap', [
  function (session) {
    builder.Prompts.choice(session,
      "What would you like to see ?",
      'My meals|My diet',
      {
        listStyle: builder.ListStyle.button,
        maxRetries: 0
      }
    );
  },
  function (session, results, next) {
      if (results.response) {
        session.userData.canBeInterrupted = false;
      switch (results.response.index) {
        case 0:
          session.send("Oh so you forgot what you ate ...")
          session.replaceDialog('getMeals', 'askForDisplay');
          break;
        case 1:
          session.send("We've concluded that you should be dead according to your meals ... you lucky squeletton");
          session.replaceDialog('getMeals', 'getAnalysis');
          break;
        default:
          session.beginDialog('default:/');
      }
    } else {
      next();
    }
  }
]);

// Fowards the meals to the dialog given
lib.dialog('getMeals', [
  function (session, nextDialog) {
    db.collection('meals').find({userId: session.userData.userId}).toArray(function (err, res) {
      if (err) throw err;
      res.push(session.userData.todaysMeals);
      if (res.length === 1 && res[0] === undefined) { // To prevent unwanted behavior when no meal is known
        session.send("... well unfortunately I couldn't find any meal at your name :c")
        session.endDialog();
      } else {
        session.replaceDialog(nextDialog, res);
      }
    })
  }
])

lib.dialog('askForDisplay', [
  function (session, args) {
    session.dialogData.res = args;
    var msgprompt = "Are you sure you want to display the meals of " + args.length + " days ?"
    builder.Prompts.confirm(session, msgprompt);
  },
  function (session, results) {
    if (results.response) {
      session.replaceDialog('displayMeals', {meals: session.dialogData.res, index: 0});
    } else {
      session.userData.canBeInterrupted = true;
      session.endDialog();
    }
  }
])

lib.dialog('displayMeals', [
  function (session, args) {
    var day = args.meals[args.index];
    var msg = "On *" + day.day + "* you ate :\n\n";

    // For every type of meal :
    for (var i = 0; i < mealNames.length; i++) {
      // We check if this meal is present in the day we're looking at
      if (day[mealNames[i]]) {
        // And we display every occurrences of this meal
        msg += "- **" + mealNames[i] + "** : " + day[mealNames[i]]/*[j]*/ +"\n\n";
      }
    }
    session.send(msg);

    // We just send a msg for 1 day, let's see if we got other days to display :
    if (args.index >= args.meals.length - 1) {
      session.userData.canBeInterrupted = true;
      session.endDialog();
    } else {
      session.replaceDialog('displayMeals', {meals: args.meals, index: args.index + 1});
    }
  }
])

var mealNames = ["breakfast", "lunch", "diner", "snack"];

lib.dialog('getAnalysis', [
  function (session, args) {
    session.dialogData.days = args;
    var today = new Date().toDateString();

    builder.Prompts.time(session, "What day would you like to see analysed ?");
  },
  function (session, results) {
    if (results.response) {
      var resquestedDay = results.response.resolution.start.toDateString();
    }
    var i = 0;
    var n = session.dialogData.days.length;

    // Looking for the requested day :
    while (i < n && session.dialogData.days[i].day != resquestedDay) {
      i++;
    }
    if (i === n) { // If we went too far it means we did not find the day
      session.userData.canBeInterrupted = true;
      session.endDialog("Sorry I couldn't find any meal at that date")
    } else {
      var mealsFound = session.dialogData.days[i];
      var foods = [];

      // For every type of meal, we check if at least one has been saved for that day
      for (var i = 0; i < mealNames.length; i++) {
        if (mealsFound[mealNames[i]] !== undefined) {
          foods = foods.concat(mealsFound[mealNames[i]]);
        }
      }
      tools.getFood(session, foods, ["energy", "protein", "fat"], preProcess1);

    }
  }
])

lib.library(require('./default').createLibrary());

module.exports.createLibrary = function () {
  return lib.clone();
};
