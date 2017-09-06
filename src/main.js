/* This is the core of the bot, where every message is processed */

var restify = require('restify');
var builder = require('botbuilder');
var uuid = require('uuid/v4');
var CronJob = require('cron').CronJob;
var remind = require('./remindershandler.js')

var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/testsMongo";


// Connection to the database
var db;
MongoClient.connect(url, null, function (err, bdd) {
  if (err) {
    throw err;
    console.log(err);
  }
  db = bdd;
});

var LUIS_URL = "YourURLGoesHere"
var recognizer = new builder.LuisRecognizer(LUIS_URL);

// Setup Restify Server
var server = restify.createServer();
server.listen(process.env.port || process.env.PORT || 3978, function () {
   console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector({
    appId: process.env.MICROSOFT_APP_ID,
    appPassword: process.env.MICROSOFT_APP_PASSWORD
});

// Listen for messages from users
server.post('/api/messages', connector.listen());

var threshold = 0.6;

// The bot is created with its default dialog
var bot = new builder.UniversalBot(connector, [
  function (session) {
    if (session.userData.isFirstRun == undefined) {
      session.beginDialog('firstRun:/');
    }

    session.beginDialog('form:preForm');
  },
  function (session) {
    // If you feel the chatbot is to silent sometimes, un-comment next line
    // session.beginDialog('menu:showMenu');
  }
])


bot.library(require('./firstrunhandler.js').createLibrary());
bot.library(require('./formhandler').createLibrary());
bot.library(require('./menuhandler').createLibrary());
bot.library(require('./paramshandler').createLibrary());
bot.library(require('./recaphandler').createLibrary());
bot.library(require('./remindershandler').createLibrary());
bot.library(require('./usage').createLibrary());
bot.library(require('./default').createLibrary());
bot.library(require('./newmealhandler').createLibrary());

var linker = {
  new_meal: 'new_meal:/',
  help: 'menu:showMenu',
  usage: 'usage:showUsage',
  reminders: 'reminders:/',
  recap: 'recap:showRecap',
  None: 'default:/'
}

var thresholds = {
  menu: 0.5,
  new_meal: 2,
  usage: 0.5,
  reminders: 2,
  recap: 2,
  params: 0.6,
  form: 2
}

// listening for incoming messages
bot.use({
  botbuilder: function(session, next) {

    session.userData.canBeInterrupted = true;

    // If this user has no ID, let's give him one
    newUserId(session);

    logUserConversation(session);

    recognizer.recognize(session, function (err, result) {
      if (err) throw err;

      if (result.score > threshold) {
        session.replaceDialog(linker[result.intent], result.entities);
      }

      var stack = session.dialogStack();
      var nStack = stack.length;

      if (nStack === 0) {
        threshold = 0.2
      } else {
        if ((stack[nStack - 1].id).search("BotBuilder:prompt") == 0) {
          nStack--;
        }
        var dialogName = (stack[nStack - 1].id).split(":")[0];

        if (thresholds[dialogName] !== undefined) {
          threshold = thresholds[dialogName];
        } else {
          threshold = .6;
        }
      }
    });
    next();
  }
});

// CronJob looking for reminders to send
var searchReminders = new CronJob('0 * * * * *', function() {
    var currentTime = new Date();
    currentTime.setSeconds(0, 0);
    db.collection('reminders').find({time: {$lte: currentTime}}).toArray(function (err, res) {
      if (err) throw err;
      if (res.length !== 0) console.log("Rappels trouvés : ", res);
      res.forEach(remind.processReminder);
    })
  }, function () { // On complete
    console.log("The CronJob searchReminders has ended (onComplete)");
  },
  true, // Autostarts
  'Europe/Paris' // Time zone
);

exports.sendReminder = function (reminder) {
  var msg = new builder.Message().address(reminder.address);
  msg.text(reminder.text);
  msg.textLocale('en-US');
  bot.send(msg, function (err, address) {
    if (err) {
      console.log(err);
      throw err;
    }
  });
}

// Adds the message to the DB
logUserConversation = function (session) {
  var text = session.message.text;
  var id = session.userData.userId;
  var newMsg = {userId: id, message: text};

  MongoClient.connect(url, function(err, db) {
    if (err) throw err;
    db.collection("messages").insertOne(newMsg, function (err, res) {
      if (err) throw err;
    })
  })
};


newUserId = function (session) {
  if (session.userData.userId == undefined) {
    session.userData.userId = uuid();
  }
}
