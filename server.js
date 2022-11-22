let express = require("express");
let app = express();
let fs = require("fs");
let FileReader = require("filereader");
let mysql = require("mysql");
let request = require('request-promise');

function searchString(subString, fullString) {
    let count = 0;
    let found = false;
    for (let i = 0; i < fullString.length; i++) {
        if (fullString[i] == subString[0]) {
            for (let j = 0; j < subString.length; j++) {
                if (subString[j] != fullString[i + j]) {
                    break;
                }
                count++;
            }
            if (count == subString.length) {
                found = true;
            }
            count = 0;
        }
    }
    return found;
}
function googleApiFormatting(string) {
    let newString = [];
    for (let i = 0; i < string.length; i++) {
        if (string[i] == " ") {
            newString.push("%");
            newString.push("2");
            newString.push("0");
        }
        else if (string[i] == ",") {
        }
        else {
            newString.push(string[i]);
        }
    }
    return newString.join("");
}

async function getLocation(array, locationArray){
    let address;
    for (let i = 0; i < array.length; i++) {
        address = array[i].name;
        await request.get("https://maps.googleapis.com/maps/api/geocode/json?address="+address+"&key=AIzaSyCv_ReAplmTzvtLqc-z_ElXyBKbXd7-anM", function(err, response, body) {
        if (!err) {
            let locals = JSON.parse(body);
            let location = [locals.results[0].geometry.location.lat, locals.results[0].geometry.location.lng]
            console.log(location);
            locationArray.push(location);
        }
        else{
            console.log(err);
            return;
        }
        });
    }
    console.log(locationArray);
    return locationArray;
}

let reader = new FileReader();

app.use(express.json({ type: "application/json" }));
app.use(express.urlencoded());

let con = mysql.createConnection({
    host: "72.182.161.176",
    user: "ash",
    password: "ash23579",
    database: "realtor_app"
});

let server = app.listen(4545, function () {
    let host = server.address().address;
    let port = server.address().port;
});

con.connect(function (error) {
    if (error) {
        console.log(error);
    }
    else {
        console.log("connection successful");
    }
});

app.get("/properties", function (req, res) {
    con.query("SELECT * FROM properties", function (error, rows, fields) {
        if (error) console.log(error);
        else {
            let array = rows;
            for (var i in array) {
                array[i].profile_image = fs.readFileSync(array[i].profile_image, "base64");
            }
            res.send(array);
            // console.log(rows);
        }
    });
});
app.get("/properties/:subString", function (req, res) {
    con.query("SELECT * FROM properties", (error, rows, fields) => {
        if (error) console.log(error);
        else {
            let subArray = [];
            let array = rows;
            let newArray = [];
            for (var i in array) {
                if (searchString(req.params.subString, array[i].name)) {
                    subArray.push(i);
                }
            }
            for (var i in subArray) {
                newArray.push(array[subArray[i]]);
            }
            for (var i in newArray) {
                newArray[i].profile_image = fs.readFileSync(newArray[i].profile_image, "base64");
            }
            res.send(newArray);
        }
    })
});
app.get("/locations", function (req, res) {
    con.query("SELECT name FROM properties", (error, rows, fields) => {
        if (error){
            return console.log(error);
        }
        else {
            let array = rows;
            for (let i = 0; i < array.length; i++) {
                array[i].name = googleApiFormatting(array[i].name);
            }
            let locationArray = []
            getLocation(array, locationArray).then(() =>{
                console.log(locationArray);
                res.send(locationArray);
            })
        }
    })
})
