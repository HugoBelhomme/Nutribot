/* This dialog is responsible for handling the parameters
 * and credits of the bot */

var builder = require('botbuilder');
var config = require('./config.js');

var MongoClient = require('mongodb').MongoClient;
var url = config.MONGOURL;

var db;
MongoClient.connect(url, null, function (err, bdd) {
  if (err) {
    throw err;
    console.log(err);
  }
  db = bdd;
});

var lib = new builder.Library('params');

lib.dialog('showParams', [
  function (session) {
    builder.Prompts.choice(session, "Parameters :",
      'My stats|Delete my data|Who made me',
      { listStyle: builder.ListStyle.button }
    );
  },
  function (session, results, next) {
    if (results.response) {
      switch (results.response.index) {
        case 0:
          session.beginDialog('showFunnyStats');
          break;
        case 1:
          session.beginDialog('deleteData');
          break;
        case 2:
          session.send("I was made by Hugo Belhomme in/at the HumanTech Institute"); //TODO: in ou at ?
          session.endDialog();
          break;
        default:
          session.beginDialog('default:/');
          break;
      }
    } else {
      next();
    }
  }
]);

lib.dialog('showFunnyStats', [
  function (session) {
    session.beginDialog('getNbMsg');
  }
])

lib.dialog('getNbMsg',[
  function(session) {
    db.collection('messages').count({userId: session.userData.userId}, function (err, res) {
      if (err) throw err;
      session.endDialog("You've sent me %d messages ... yayyy !", res);
    })
  }
])

lib.dialog('getFirstMsg',[
  function (session) {
    db.collection('messages').find({userId: session.userData.userId}).sort({_id: 1}/*).limit(1*/, function (err, res) {
      if (err) throw err;
      session.endDialog("The first message you ever sent me was \"%s\".", res.message);
    })
  }
])

lib.dialog('deleteData',[
  function (session) {
    builder.Prompts.choice(session, "Are you sure ?", 'Yes|No',
                          { listStyle: builder.ListStyle.button });
  },
  function (session, results) {
    switch (results.response.index) {
      case 0:
        session.endDialog("Ok, I deleted everything I had on you (THATS A LIE WRITTEN BY THE DEV, DON'T TRUST HIM)");
        break;
      case 1:
        session.endDialog("Changed your mind uh ?");
        break;
      default:
        session.beginDialog('default:/');
        break;
    }
  }
])


lib.library(require('./default').createLibrary());

module.exports.createLibrary = function () {
  return lib.clone();
};
