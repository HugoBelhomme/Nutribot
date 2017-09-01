/* This file regroups every function, list or dictionnary used by dialogStack
 * and that could be used by another one as well
 */

var fs = require('fs');
var pluralize = require('pluralize');
var w2n = require ('words-to-numbers');


exports.getFood = function (session, foodsToFind, nuts, callback) {
   fs.readFile('../assets/SwissFoodDataEn.txt', 'utf8', function (err, data) {
     var doc = data.split("\n");
     for (var i = 0; i < doc.length; i++) {
       tmp = doc[i].split('\t');
       doc[i] = tmp;
     }

     var res = foodsToFind.map(function(){return []});

     // Doc is an array of line, each line is an array aswell
     // We're going through each line and collecting the lines we need
     for (var i = 0; i < doc.length - 1; i++) {
       var foodToCheck = doc[i][3].toLowerCase();
       // We check if it matches any food in the list
       for (var j = 0; j < foodsToFind.length; j++) {
         if (foodToCheck.search(pluralize.singular(foodsToFind[j][0])) !== -1) {
           // And if it does, we add every information requested
           var tmp = [];
           tmp.push(doc[i][3].toLowerCase()); // The name of the occurrence
           tmp.push(doc[i][5].toLowerCase()); // The category of the occurrence
           for (var k = 0; k < nuts.length; k++) { // And the nut stuff
             var nut = nutDict[nuts[k]]
             tmp.push(Number(doc[i][nut.pos]));
           }
           res[j].push(tmp);
         }
       }
     }
     callback(session, foodsToFind, nuts, res);
   })
 }

// This function tries to narrow the list obtained by searching through the DB
// by checking if there aren't matches better than others
preProcess1 = function (session, foods, nuts, args) {
   // We create the res holder : a list of empty lists
   var res = foods.map(function(){return []});

   // For each food :
   for (var i = 0; i < foods.length; i++) {
     var food = foods[i][0];

     // We start by checking if any item begins with "food,"
     // which would mean that this is the item we look for
     for (var j = 0; j < args[i].length; j++) {
       if (args[i][j][0].search(food+",") === 0) {
         res[i].push(args[i][j])
       }
     }

     // If not perfect match has been found,
     // we look for items begining with "food "
     if (res[i].length == 0) {
       for (var j = 0; j < args[i].length; j++) {
         if (args[i][j][0].search(food+" ") === 0) {
           res[i].push(args[i][j])
         }
       }

       // If no good match has been found, we just send everything we got
       if (res[i].length == 0) {
         res[i] = args[i];
       }
     }
   }
   preProcess2(session, foods, nuts, res); // CHECK THE CATEGORY
 }

// This function tries to further narrow the list by removing stuff like raw fish
preProcess2 = function(session, foods, nuts, args) {
   var res = foods.map(function(){return []});

   for (var i = 0; i < foods.length; i++) {
     for (var j = 0; j < args[i].length; j++) {
       if (!shouldIgnore(args[i][j])) {
         res[i].push(args[i][j]);
       }
     }
   }
   processMealsData(session, foods, nuts, res);
 }

shouldIgnore = function (line) {
  return (checkFruit(line) || checkMeat(line) || checkFish(line) || checkVegg(line))
}
checkFruit = function (line) {
  return (line[1].search("fruit") == 0 && line[0].search("fresh") == -1 && line[0].search("raw") == -1)
}
checkMeat = function (line) {
  return (line[1].search("meat") == 0 && line[0].search("raw") != -1)
}
checkFish = function (line) {
  return (line[1].search("fish") == 0 && line[0].search("raw") != -1)
}
checkVegg = function (line) {
  return (line[1].search("vegetables") == 0 && line[0].search("raw") != -1)
}

// Computes the mean for every nut
processMealsData = function (session, foods, nuts, table) {
  // table = [[[foodFound1, nut1-1, nut1-2], [foodFound2, nut2-1, nut2-2], ...], ...]
  // We're going to build something like {energy:95, protein:1.1, fat:0.3}
  var res = {};
  var nlen = nuts.length;
  //console.log(table);c
  // For every nut in the list
  for (var i = 0; i < nlen; i++) {
    var summ = 0;
    var nbOcc = 0;
    //console.log(nuts[i]);
    // For every food listed
    for (var k = 0; k < foods.length; k++) {
      // For every occurence found for foods[i]
      for (var j = 0; j < table[k].length; j++){
        var qtty = foods[k][1][0];
        // In "2 bowls", 2 is the mutliplier and bowls the unit
        var multi = 1;
        if (qtty.length === 2) {
          multi = strToNumber(qtty[0]);
        }
        var unit = qttyList[pluralize.singular(qtty[qtty.length - 1])];

        summ += Number(table[k][j][i + 2]) * multi * unit;
        nbOcc++;
      }
    }
    summ /= nbOcc;
    res[nuts[i]] = summ;
  }

  var msg = "Moyenne de la somme des aliments de la journée :\n\n";
  for (var i = 0; i < nuts.length; i++) {
    res[nuts[i]] = Math.round(res[nuts[i]] * 1000) / 1000;
    msg += "- " + nuts[i] + " : " + res[nuts[i]] + " " + nutDict[nuts[i]].unit + "\n\n";
  }
  session.send(msg);
  session.userData.canBeInterrupted = true;
  session.endDialog();
}

// Position and unit of every relevant nutritionnal information
var nutDict = {
  category: {pos: 5},
  energy: {unit: "kcal", pos: 12},
  protein: {unit: "g", pos: 17},
  alcohol: {unit: "g", pos: 22},
  water: {unit: "g", pos: 27},
  carbohydrates: {unit: "g", pos: 32},
  starch: {unit: "g", pos: 37},
  sugar: {unit: "g", pos: 42},
  fibres: {unit: "g", pos: 47},
  fat: {unit: "g", pos: 52},
  cholesterol: {unit: "mg", pos: 57},
  fatty_acids_monounsaturated: {unit: "g", pos: 62},
  fatty_acids_saturated: {unit: "g", pos: 67},
  fatty_acids_polyunsaturated: {unit: "g", pos: 72},
}

const qttyList = exports.qttyList = {
  cup: 0.5,
  bowl: 1,
  teaspoon: 0.01,
  tsp: 0.01,
  tablespoon: 0.03,
  tbsp: 0.03,
  plate: 2,
  a: 0.5,
  an: 0.5
}

// Parses the entity list to produce a list of servings
// res = [[food1, qtty1], [food2, qtty2], ... ]
exports.processEntities = function (entities) {
  if (entities) {
    var foods = [];
    var qtts = [];
    var servs = [];
    var meal = "";
    var res = [];

    // Going through entities and placing them in the right categories
    // this is done to prevent weird stuff related
    // to the order of returned entities by Luis.ai
    for (var i = 0; i < entities.length; i++) {
      if (entities[i].type == 'food'){
        foods.push(entities[i].entity);
      } else if (entities[i].type == 'quantity') {
        qtts.push(entities[i].entity);
      } else if (entities[i].type == 'serving') {
        servs.push(entities[i].entity);
      } else if (entities[i].type == 'meal') {
        meal = entities[i].entity
      }
    }
    for (var i = 0; i < servs.length; i++) {
      var tmpRes = [];

      for (var j = 0; j < foods.length; j++) {
        if (servs[i].search(foods[j]) !== -1) {
          tmpRes.push(foods[j]);
        }
      }
      for (var j = 0; j < qtts.length; j++) {
        if (servs[i].search(qtts[j]) !== -1) {
          tmpRes.push(qtts[j].split(" "));
        }
      }

      res.push(tmpRes);
    }
    return [res, meal];
  } else {
    return [[],''];
  }
}

// Cluncky wraper, its purpose is to make sure we get a number.
// If it is called on anything else than a number, it still returns an int : 0
// This allows not to interrupt the flow of actions afterwards
const strToNumber = exports.strToNumber = function (str) {
  var res;
  if (str === "a" || str === "an") {
    return 1;
  }
  if (isNaN(str)) {
    res = w2n.wordsToNumbers(str);
  } else {
    res = Number(str);
  }

  if (isNaN(res)) {
    return 0;
  } else {
    return res;
  }
}

// Allows to split a string according to multiple CARACTERS at the same time (does not support words as separators)
exports.multipleSplit = function (string, separators, banWords) {
  var tmpRes = [""];
  var index = 0;
  var res = [];

  for (var i = 0; i < string.length; i++) {
    if (separators.indexOf(string[i]) !== -1) {
      index++;
      tmpRes.push("");
    } else {
      tmpRes[index] += string[i]
    }
  }
  // Post processing, removing the empty slots and the 'and's
  for (var i = 0; i < tmpRes.length; i++) {
    if (!isInList(tmpRes[i], banWords)) {
      res.push(tmpRes[i]);
    }
  }
  return res;
}

exports.mealNames = ["breakfast", "lunch", "diner", "snack"];

const isInList = exports.isInList = function (e, list) {
  for (var i = 0; i < list.length; i++) {
    if (list[i] == e) return true;
  }
  return false;
}
