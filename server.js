let express = require("express");
let app = express();
let fs = require("fs");
let FileReader = require("filereader");
let mysql = require("mysql");
let request = require('request-promise');
const axios = require("axios");
const { response } = require("express");

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
function getPostalCode(latlng){
    return new Promise((resolve, reject) =>{
        let postalCode;
        let locationArray = latlng.split(",");
        const options = {
            method: "GET",
            url: "https://maps.googleapis.com/maps/api/geocode/json?latlng="+locationArray[0]+","+locationArray[1]+"&key=AIzaSyCv_ReAplmTzvtLqc-z_ElXyBKbXd7-anM"
        };
        axios.request(options)
        .then((response) =>{
            resolve(response.data.results[0].address_components[6].short_name);
            
        })
        .catch((error)=>{
            console.log(error);
            return;
        });
    })
}
async function getProperties(postalCode){
    // fs.readFile("mlsProperties.txt")
    return new Promise((resolve, reject) =>{
        try {
            const options = {
                method: 'GET',
                url: 'https://us-real-estate.p.rapidapi.com/v2/for-sale-by-zipcode',
                params: {zipcode: `${postalCode}`, offset: '0', limit: '50'},
                headers: {
                  'X-RapidAPI-Key': 'dd99d0f78dmsh6ee33ac1fc66979p1c84f5jsn3a581a7b6545',
                  'X-RapidAPI-Host': 'us-real-estate.p.rapidapi.com'
                }
              };
              axios.request(options).then((response) => {
                let propertiesList = [];
                response.data.data.home_search.results.forEach(element => {
                    propertiesList.push({
                        "id": element.property_id,
                        "name": element.location.address.line + ", " + element.location.address.city + ", " + element.location.address.state_code + ", " + element.location.address.postal_code,
                        "description": `${element.description.beds} bds | ${element.description.baths} ba | ${element.description.sqft} sqft`,
                        "profile_image": element.primary_photo.href
                    })
                });
                resolve(propertiesList);
              })
        } catch (error) {
            console.log(error);
            reject()
        }
    })
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
app.get("/mls-properties/:latlng", function (req, res) {
    getPostalCode(req.params.latlng)
    .then((postalCode) =>{
        console.log(postalCode);
        return getProperties(postalCode);
    })
    .then((properties) => {
        // console.log(properties);
        res.send(properties);
    })
})