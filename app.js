var firebase = require("firebase");
var fetch = require("node-fetch");
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const { document } = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`).window;

// Initialize Firebase
var config = {
  apiKey: process.env.apikey,
  authDomain: "exeter-dining-halls.firebaseapp.com",
  databaseURL: "https://exeter-dining-halls.firebaseio.com",
  storageBucket: "exeter-dining-halls.appspot.com",
};

firebase.initializeApp(config);

firebase.auth().signInWithEmailAndPassword("dininghallco@gmail.com", process.env.password + "").catch(function(error) {
  // Handle Errors here.
  var errorCode = error.code;
  var errorMessage = error.message;
  // ...
});


exports.exportDishData = function() {
  var dishRef = firebase.database().ref('Dishes');
  var exportArray = [
    ["Dish Name", "Number of Ratings", "Average Rating", "Number of Comments", "Comments"],
    [""]
  ];
  return dishRef.once('value').then(function(snapshot) {
    if(!snapshot.exists() || !snapshot.hasChildren()) {
      console.log("There are no dishes yet! Try Updating Menus");
      return;
    }
    snapshot.forEach(function(childSnapshot) {
      var dishArray = [];
      dishArray.push(childSnapshot.key);
      dishArray.push(childSnapshot.child("numRatings").val());
      dishArray.push(childSnapshot.child("avgRating").val());
      var comments = childSnapshot.child("comments");
      if (comments.exists() && comments.hasChildren()) {
        dishArray.push(comments.numChildren());
        comments.forEach(function(commentSnapshot) {
          dishArray.push("Sender: " + commentSnapshot.child("returnEmail").val() + ", Comment: " + commentSnapshot.child("text").val());
        });
      } else {
        dishArray.push(0);
      }
      exportArray.push(dishArray);


    });
    return getCSVFrom2DArray(exportArray, "Dish Data");
  });
}

exports.exportDiningFeedback = function() {
  return exportFeedback(true);
}

exports.exportAppFeedback = function() {
  return exportFeedback(false);
}

function exportFeedback(isDining) {

  var feedbackRef = firebase.database().ref(isDining ? "Dhall Feedback" : "App Feedback");
  var exportArray = [["Unique ID", "Sender", "Date ", "Text"], [""] ];
  return feedbackRef.once('value').then(function(snapshot) {
    if(!snapshot.exists() || !snapshot.hasChildren()){
      console.log("There is no feedback yet!")
       return;
    }
    snapshot.forEach(function(userSnapshot) {
      if (!userSnapshot.exists() || !userSnapshot.hasChildren()) {
        console.log("There is no feedback yet!")
        return;
      }
      userSnapshot.forEach(function(childSnapshot) {
        var feedbackArray = [];
        feedbackArray.push("ID: \"" + childSnapshot.key + "\"");
        feedbackArray.push(childSnapshot.child("returnEmail").val());
        feedbackArray.push(childSnapshot.child("date").val());
        feedbackArray.push(childSnapshot.child("text").val());
        exportArray.push(feedbackArray);
      });
    });
    return getCSVFrom2DArray(exportArray, (isDining ? "Dining Services" : "App") + " Feedback");
  });
}

function getCSVFrom2DArray(array, name) {
  var csvRows = [];

  for (var i = 0; i < array.length; ++i) {
    csvRows.push(array[i].join(','));
  }

  var csvString = csvRows.join("\r\n");
  return csvString
}

exports.downloadMenus = function() {
  fetch('https://api.exeter.edu/api/DiningMenu/GetDiningMenus')
  .then(function(response) {
    return response.json();
  })
  .then(function(data) {
    //data is the JSON string
    console.log("Recieved Data");
    for (var i = 0; i < data.length; i++) {
      console.log("<br>Processing Menu #" + (i + 1) + "<br><br>");
      var menu = {}
      menuData = data[i]
      for (var key in menuData) {
        if (menuData.hasOwnProperty(key)) {
            val = menuData[key]
            //console.log("Key: " + key + " Val: " + val);
            var div = document.createElement("div");
           // console.log(val);
            if(!/<[a-z][\s\S]*>/i.test(val)){
              div.innerHTML = val;
              var text = div.textContent || div.innerText || "";
              text = text.replace(/\n/g, "_");
              menu[key] = text;
            }else{
              //console.log(val);
              test = val.split("</div><div>").join("_");
              //console.log(test);
              div.innerHTML = test;
              var text = div.textContent || div.innerText || "";
             // console.log(text);
              text = text.replace(/\n/g, "_");
              menu[key] = text;
            }
        }
      }
      uploadMenu(menu)
    }
  });
}

function uploadMenu(menu) {
  console.log("ID: " + menu["DateCreated"]);
  console.log("DATE:" + menu["DateOfMeal"]);
  var newMenu = {};
  var dateString = getDateString(new Date(menu["DateOfMeal"]));
  console.log("Creating New Menu for " + dateString + " from original: " + menu["DateOfMeal"]);
  newMenu["menuID"] = menu["ID"];
  newMenu["brunchToday"] = false;
  newMenu["showTopMessageOnly"] = menu["ShowTopMessageOnly"];
  newMenu["status"] = menu["Status"];
  newMenu["specialMessage"] = menu["SpecialMessage"];
  newMenu["messageTopMenu"] = menu["MessageTopMenu"];
  var breakfast = getMeals(menu["Breakfast"]);
  var lunch = getMeals(menu["Lunch"]);
  var dinner = getMeals(menu["Dinner"]);
  newMenu["elmBreakfast"] = breakfast["elm"];
  newMenu["wethBreakfast"] = breakfast["weth"];
  newMenu["elmLunch"] = lunch["elm"];
  newMenu["wethLunch"] = lunch["weth"];
  newMenu["elmDinner"] = dinner["elm"];
  newMenu["wethDinner"] = dinner["weth"];

  firebase.database().ref('Menus/' + dateString).set(newMenu);
}

function getMeals(mealString) {
  var dishArray = mealString.split("_");
  var wethArray = [];
  var elmArray = [];
  var isElm = true;
  var i = -1;
  while (++i < dishArray.length) {
    var curDish = dishArray[i];
    //console.log("Checking **" + curDish + "**");
    if (curDish === undefined || curDish == null || curDish.length <= 0) {
      console.log("No Text");
      continue;
    }
    curDish = curDish.replace(/[.$#]/g, " ");
    if (/\S/.test(curDish) == false) {
      console.log("Cur Dish was Empty");
      continue;
    }
    if (curDish.toLowerCase().includes("elm street")) {
      isElm = true;
      continue;
    } else if (curDish.toLowerCase().includes("wetherell")) {
      isElm = false;
      continue;
    }
    if (isElm) {
      elmArray.push(curDish);
    } else {
      wethArray.push(curDish);
    }
  }
  processDishes(wethArray);
  processDishes(elmArray);
  var mealDict = {
    weth: wethArray,
    elm: elmArray
  };
  return mealDict;
}

function getDateString(date) {
  date.setHours(date.getHours() + 12);
  var month = (date.getMonth() + 1).toString();
  var day = date.getDate().toString();
  var year = (date.getFullYear());
  if (month.length == 1) {
    month = "0" + month;
  }
  if (day.length == 1) {
    day = "0" + day;
  }
  return month + "-" + day + "-" + year;
}

function processDishes(dishNames) {
console.log("PRocessing Dishes!")
  var dishRef = firebase.database().ref('Dishes');
  dishRef.once('value').then(function(snapshot) {
    for (var i = 0; i < dishNames.length; i++) {
      var dishName = dishNames[i];
      if (!snapshot.child(dishName).exists()) {
        var newDish = {};
        newDish["avgRating"] = 0.0;
        newDish["numRatings"] = 0;
        firebase.database().ref('Dishes/' + dishName).set(newDish);
      }
    }
  });
}
