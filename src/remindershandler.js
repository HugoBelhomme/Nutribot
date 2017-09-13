/* This dialog is responsible for setting and displaying reminders */

var builder = require('botbuilder');
var main = require('./main.js');
var BSON = require('bson');
var config = require('./config.js')

var lib = new builder.Library('reminders');

var MongoClient = require('mongodb').MongoClient;
var url = config.MONGURL;
var db;
MongoClient.connect(url, null, function (err, bdd) {
  if (err) {
    throw err;
    console.log(err);
  }
  db = bdd;
});

var LUIS_URL = config.LUISURL;
var recognizer = new builder.LuisRecognizer(LUIS_URL);


lib.dialog('/', [
  function (session) {
    builder.Prompts.choice(session, "What do you want to do ?",
                           'See my reminders|Set a new reminder',
                           {
                             listStyle: builder.ListStyle.button,
                             retryPrompt: "I'm sorry, I need you to pick a valid option !",
                             maxRetries: 2
                           }
                         );
  },
  function (session, results) {
    if (results.response) {
      switch (results.response.index) {
        case 0:
          session.replaceDialog('showReminders');
          break;
        case 1:
          session.replaceDialog('createReminder');
          break;
        default:
          session.replaceDialog('default:/');
          break;
      }
    }
  }
])

lib.dialog('showReminders', [
  function (session) {
    session.send("Here are all your reminders :");
    session.send("...");

    var query = {userId: session.userData.userId}
    db.collection('reminders').find(query).toArray(function (err, res) {
      if (err) {
        throw err
      }
      if (res.length === 0) {
        session.endDialog("I couldn't find any reminders at your name")
      } else {
        var cards = buildCarousel(session, res);
        var msg = new builder.Message(session)
          .attachmentLayout(builder.AttachmentLayout.carousel)
          .attachments(cards)
        session.send(msg);
        session.beginDialog('showRemindersFollowUp')
      }

    })
  }
])

lib.dialog('showRemindersFollowUp', [
  function (session) {
    var msgP = "Please click a button above if you want to delete a reminder";
    builder.Prompts.text(session, msgP);
  },
  function (session, results) {
    var button = session.message.text;
    var response = button.split(' ');

    if (response[0] === 'delete' && response.length === 2) {
      deleteReminder({_id: response[1]});
      session.endDialog("Reminder deleted.");
    } else {
      session.endDialog();
    }

  }
])

lib.dialog('createReminder', [
  function (session) {
    session.dialogData.reminder = {};
    builder.Prompts.text(session, "What you would like to be reminded of ?");
  },
  function (session, results) {
    session.dialogData.reminder.text = results.response;
    builder.Prompts.time(session, "What time would you like to set the reminder for ?");
  },
  function (session, results) {
    var tmptime = new Date(builder.EntityRecognizer.resolveTime([results.response]));
    tmptime.setSeconds(0);
    session.dialogData.reminder.time = tmptime;
    builder.Prompts.confirm(session, "Do you want this reminder to be daily ?");
  },
  function (session, results) {
    session.dialogData.reminder.repeat = results.response;
    addReminder(session.dialogData.reminder, session.userData);
    session.endDialog();
  }
])




addReminder = function (reminder, user) {
  var newReminder = {
                      userId: user.userId,
                      text: reminder.text,
                      time: new Date(reminder.time),
                      repeat: reminder.repeat,
                      address: user.address
                    };
  db.collection('reminders').insertOne(newReminder, function (err, res) {
    if (err) throw err;
    console.log("Le rappel suivant a été ajouté : ", res.ops);
  })
}

exports.processReminder = function (reminder) {
  main.sendReminder(reminder);
  if (!reminder.repeat) {
    deleteReminder(reminder);
  } else {
    renewReminder(reminder);
  }
}

deleteReminder = function (reminder) {
  db.collection('reminders').deleteOne({_id: new BSON.ObjectID(reminder._id)}, function (err, res) {
    if (err) throw err;
    console.log("Reminder deleted :");
    console.log(res.result);
  })
}

renewReminder = function (reminder) {
  var newTime = new Date(reminder.time);
  // Only supported option is daily for now
  var nbDays = 1;
  // Adding the correct amount of ms to make a day : 86400000
  newTime.setTime(newTime.getTime() + nbDays * 60000);
  var newValue = { $set: {time: newTime.toISOString()} };
  db.collection('reminders').updateOne({_id: reminder._id}, newValue, function (err, res) {
    if (err) throw err;
    console.log("Reminder updated.");
  })
}

function buildCarousel (session, reminders) {
  var res = [];

  for (var i = 0; i < reminders.length; i++) {
    var returnCode = "delete " + reminders[i]._id;
    var time = new Date (reminders[i].time);
    var card = new builder.ThumbnailCard(session)
                   .title(time.toUTCString())
                   .text(reminders[i].text)
                   .images([
                     builder.CardImage.create(session, 'https://maxcdn.icons8.com/Share/icon/Objects//alarm_clock1600.png')
                   ])
                   .buttons([
                     builder.CardAction.postBack(session, returnCode, "Delete this reminder")
                   ])
    res.push(card)
    }

    return res;
}

module.exports.createLibrary = function () {
  return lib.clone();
};
