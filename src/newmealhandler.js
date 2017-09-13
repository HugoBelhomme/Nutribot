var builder = require('botbuilder');
var tools = require('./tools.js');
var pluralize = require('pluralize');
var config = require('./config.js')

var MongoClient = require('mongodb').MongoClient;
var url = config.MONGOURL;

var lib = new builder.Library('new_meal');

var LUIS_URL = config.LUISURL;
var recognizer = new builder.LuisRecognizer(LUIS_URL);


var db;
MongoClient.connect(url, null, function (err, bdd) {
  if (err) {
    throw err;
    console.log(err);
  }
  db = bdd;
});



lib.dialog('/', [
  function (session, arg, next) {
    // lastmeal[1] is the name of the meal
    // lastmeal[0] is the list of servings of that meal, it looks like :
    //             [[food1, qtty1], [food2, qtty2], ... ]
    session.userData.lastmeal = tools.processEntities(arg);

    //If no serving (i.e. food) was found by Luis.ai, we ask the user directly
    var mealName = session.userData.lastmeal[1]
    if (session.userData.lastmeal[0].length === 0) {
      session.beginDialog('getFood');
    } else {
      next();
    }
  },
  function (session, args, next) {
    session.beginDialog('checkQuantity');
    next();
  },
  function (session, args, next) {
    mealName = session.userData.lastmeal[1];
    // If the name of the meal was not found by Luis.ai
    // or isn't in mealNames, we ask the user directly
    if (mealName.length === 0 || !(tools.isInList(mealName, tools.mealNames))) {
      session.beginDialog('getMealName');
    }
    next();
  },
  function (session) {
    var tmpDate = new Date();
    var today = tmpDate.toDateString();
    var todaysMeals = session.userData.todaysMeals;

    // We check if there are meal from another day, and if there are,
    // we add them to the DB and reset todaysMeals
    if (todaysMeals !== undefined && todaysMeals.day != today) {
      addTodaysMeals(todaysMeals, session.userData.userId);
      session.userData.todaysMeals = {};
      session.userData.todaysMeals.day = today;
    } else if (todaysMeals === undefined) { //Or if it is not defined yet
      session.userData.todaysMeals = {};
      session.userData.todaysMeals.day = today;
    }

    // If the meal we want to add has not been added to todaysMeals yet
    if (session.userData.todaysMeals[session.userData.lastmeal[1]] === undefined) {
      session.userData.todaysMeals[session.userData.lastmeal[1]] = [];
    }

    session.userData.todaysMeals[session.userData.lastmeal[1]] = session.userData.todaysMeals[session.userData.lastmeal[1]].concat(session.userData.lastmeal[0]);

    var name = "Kevin";
    if (session.userData.form !== undefined) {
      name = session.userData.form.name;
    }

    session.send("Oh you ate %s for %s, great move ... keep it up %s",
                session.userData.lastmeal[0], session.userData.lastmeal[1], name);

    builder.Prompts.confirm(session, "Do you want to register another meal for today ?");
  },
  function (session, results) {
    if (results.response) { // If the user said yes
      session.replaceDialog('/', []); // We restart this dialog to add a new meal
    } else {
      session.endDialog();
    }
  }
])


lib.dialog('getFood', [
  function (session) {
    builder.Prompts.text(session, "Could you please tell me what this meal was made of ?");
  },
  function (session, results) {
    console.log("QUE FAIT LA POLICE");
    recognizer.recognize(session, function (err, result) {
      if (err) throw err;
      var sortedEntities = tools.processEntities(result.entities);
      // If Luis.ai did not manage to get the food,
      // it's most likely a list without quantities so we'll try
      // to multisplit it to at least get stuff
      if (sortedEntities[0].length === 0){
        sortedEntities = tools.multipleSplit(results.response, [' ', ',', ';'],
                                      ['and', 'with']);
      }
      session.userData.lastmeal[0] = session.userData.lastmeal[0]
                                                    .concat(sortedEntities[0]);
      session.endDialog();
    })
    setTimeout(function() {
      console.log("timeOut over ");
    }, 2000);
  }
])

lib.dialog('checkQuantity', [
  function (session, args) {
    // Save previous state (create on first call)
    session.dialogData.index = args ? args.index + 1 : 0;

    // If the list has already been processed, we leave
    if (session.userData.lastmeal[0].length <= session.dialogData.index) {
      session.endDialog();
    } else {
      var data = session.userData.lastmeal[0][session.dialogData.index];
      session.dialogData.data = data;

      // If no quantity is given, we'll have to push it later
      if (data.length < 2) {
        session.dialogData.flagPush = true;
        session.replaceDialog('askForQuantity', session.dialogData)
        // If an unknown quantity was given, we'll have to change its value
      } else {
        // Here data = ["food", ["number", "unit"]] or ["food", ["unit"]]
        var unit = data[1][data[1].length - 1];

        if (tools.qttyList[pluralize.singular(unit)] === undefined) {
          session.dialogData.flagPush = false;
          session.replaceDialog('askForQuantity', session.dialogData)
        } else { // We enter here only if a known quantity was given

          // We can move to the next food
          session.replaceDialog('checkQuantity', session.dialogData)
        }
      }
    }
  }
])

lib.dialog('askForQuantity', [
  function (session, args) {
    session.dialogData.flagPush = args.flagPush;
    session.dialogData.index = args.index;

    var promptMsg = "How much " + args.data[0] + " did you had ?" + "\n\n" +
                    "(I understand quantifiers like a bowl, a cup, a spoon "+
                    "but you can also tell me in *g*)";
    // Prompt user for next field
    builder.Prompts.text(session, promptMsg);
  },
  function (session, results) {
    var res = results.response.split(" ");

    // We save the user answer according to the flagPush
    if (session.dialogData.flagPush) {
      session.userData.lastmeal[0][session.dialogData.index].push(res);
    } else {
      var len = session.userData.lastmeal[0][session.dialogData.index][1].length;
      session.userData.lastmeal[0][session.dialogData.index][1][len-1] = res;
    }

    // And we iterate
    session.replaceDialog('checkQuantity', session.dialogData)
  }
])


lib.dialog('getMealName', [
  function (session) {
    builder.Prompts.choice(session, "What meal was that ?",
                          'Breakfast|Lunch|Diner|Snack',
                          {
                            listStyle: builder.ListStyle.button,
                            retryPrompt: "I'm sorry, I need you to pick a valid option !",
                            maxRetries: 2
                          });
  },
  function (session, results) {
    if (results.response) {
      session.userData.lastmeal[1] = results.response.entity.toLowerCase()
    }
    session.endDialog();
  }
])

module.exports.createLibrary = function () {
  return lib.clone();
};



addTodaysMeals = function (meals, id) {
  var newDay = meals;
  newDay.userId = id;
  db.collection('meals').insertOne(newDay, function (err, res) {
    if (err) throw err;
    console.log("Les repas suivants ont été ajoutés : ", newDay);
  })
}
