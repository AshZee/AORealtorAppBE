let express = require("express");
let app = express();
let fs = require("fs");
let FileReader = require("filereader");
let mysql = require("mysql");
let request = require("request-promise");
const axios = require("axios");
const { response } = require("express");

class hashMap {
  constructor(linesOfFile) {
    this.startingNumOfLines = linesOfFile.length;
    this.linesOfFile = linesOfFile;
    this.numOfLines = linesOfFile.length;
    this.occupied = 0;
    this.hashSize = this.getHashSize(linesOfFile);
    //   console.log(this.hashSize)
    this.hashedArray = Array(this.hashSize);
    this.hashArray(linesOfFile);
  }
  getHashSize(array) {
    return this.nextPrime(array.length * 2);
  }
  nextPrime(number) {
    let integer = number;
    let isPrime = false;
    while (!isPrime) {
      integer = integer + 1;
      isPrime = true;
      for (let i = 2; i < Math.sqrt(integer) + 1; i++) {
        if (integer % i == 0) {
          isPrime = false;
          break;
        }
      }
    }
    return integer;
  }
  hashArray(linesOfFile) {
    linesOfFile.forEach((line) => {
      this.hash(line);
    });
  }
  hash(line) {
    let zipCode = parseInt(line.slice(0, 5));
    let hashPosition = zipCode % this.hashSize;
    while (this.hashedArray[hashPosition] != null) {
      hashPosition = (hashPosition + 1) % this.hashSize;
    }
    this.hashedArray[hashPosition] = line;
    this.occupied++;
    if (this.occupied >= 2 * this.startingNumOfLines) {
      this.hashMapResize();
    }
  }
  hashMapResize() {
    console.log("resizing...");
    let tempArray = [];
    this.hashedArray.forEach((element) => {
      if (element != null) {
        tempArray.push(element);
      }
    });
    let tempHashMap = new hashMap(tempArray);
    this.hashedArray = tempHashMap.hashedArray;
    this.occupied = tempHashMap.occupied;
    this.hashSize = tempHashMap.hashSize;
  }
  add(zipCode, data) {
    let line = `${zipCode} - ${JSON.stringify(data)}`;
    this.numOfLines++;
    fs.appendFile("mlsProperties.txt", `\n${line}`, (err) => {
      console.log("Updating file...");
      if (err) {
        console.log(err);
      }
    });
    this.hash(line);
  }
  find(zipCode) {
    zipCode = parseInt(zipCode);
    let found = false;
    let index = zipCode % this.hashSize;
    try {
      while (!found) {
        if (this.hashedArray[index].slice(0, 5) == zipCode.toString()) {
          found = true;
          break;
        } else {
          if (this.hashedArray[index] == null) {
            break;
          }
          index++;
        }
      }
    } catch (error) {
      console.log(error);
    }
    if (found) {
      return index;
    } else {
      return -1;
    }
  }
  print() {
    console.log(
      `Lines of File: ${this.numOfLines}\n
          Size of Array: ${this.hashSize}\n
          Occupied: ${this.occupied}\n
          Array Elements: `,
      this.hashedArray
    );
  }
}
let hashMapCreated = false;
let hm;
fs.readFile("mlsProperties.txt", (err, data) => {
  if (data != "") {
    hashMapCreated = true;
    linesOfFile = data.toString().split("\n");
    // console.log(linesOfFile)
    hm = new hashMap(linesOfFile);
    console.log("Hash map created");
  }
});

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
    } else if (string[i] == ",") {
    } else {
      newString.push(string[i]);
    }
  }
  return newString.join("");
}
function getPostalCode(latlng) {
  return new Promise((resolve, reject) => {
    let postalCode;
    let locationArray = latlng.split(",");
    const options = {
      method: "GET",
      url:
        "https://maps.googleapis.com/maps/api/geocode/json?latlng=" +
        locationArray[0] +
        "," +
        locationArray[1] +
        "&key=AIzaSyCv_ReAplmTzvtLqc-z_ElXyBKbXd7-anM",
    };
    axios
      .request(options)
      .then((response) => {
        console.log(`URL: ${options.url}`);
        console.log(response.data.results[0])
        let index = 6;
        for(let i = 0; i < response.data.results[0].address_components.length; i++) {
          if(response.data.results[0].address_components[i].types.includes("postal_code")){
            index = i;
            break;
          }
        }
        resolve(response.data.results[0].address_components[index].short_name)
      })
      .catch((error) => {
        console.log(error);
        return;
      });
  });
}
async function getProperties(postalCode) {
  return new Promise((resolve, reject) => {
    if (hashMapCreated) {
      let index = hm.find(postalCode);
      if (index >= 0) {
        console.log("Sending locally...");
        console.log(JSON.parse(hm.hashedArray[index].slice(8)));
        resolve(JSON.parse(hm.hashedArray[index].slice(8)));
        return;
      }
    }
    try {
      const options = {
        method: "GET",
        url: "https://us-real-estate.p.rapidapi.com/v2/for-sale-by-zipcode",
        params: { zipcode: `${postalCode}`, offset: "0", limit: "50" },
        headers: {
          "X-RapidAPI-Key":
            "dd99d0f78dmsh6ee33ac1fc66979p1c84f5jsn3a581a7b6545",
          "X-RapidAPI-Host": "us-real-estate.p.rapidapi.com",
        },
      };
      axios.request(options).then((response) => {
        let propertiesList = [];
        response.data.data.home_search.results.forEach((element) => {
          propertiesList.push({
            id: element.property_id,
            name:
              (element.location.address.line == null ? "N/A" : element.location.address.line) +
              ", " +
              (element.location.address.city == null ? "N/A" : element.location.address.city) +
              ", " +
              (element.location.address.state_code == null ? "N/A" : element.location.address.state_code) +
              ", " +
              (element.location.address.postal_code == null ? "N/A" : element.location.address.postal_code),
            description: `${(element.description.beds == null ? "N/A" : element.location.address.beds)} bds | ${(element.description.baths == null ? "N/A" : element.location.address.baths)} ba | ${(element.description.sqft == null ? "N/A" : element.location.address.sqft)} sqft`,
            profile_image: element.primary_photo.href,
          });
        });
        if (!hashMapCreated) {
          fs.appendFile(
            "mlsProperties.txt",
            `${postalCode} - ${JSON.stringify(propertiesList)}`,
            (err) => {
              console.log("Updating file...");
              if (err) {
                console.log(err);
              }
            }
          );
          hm = new hashMap([
            `${postalCode} - ${JSON.stringify(propertiesList)}`,
          ]);
          console.log("Hash map created");
        } else {
          console.log("Adding new element to hash map");
          hm.add(postalCode, propertiesList);
        }
        resolve(propertiesList);
      });
    } catch (error) {
      console.log(error);
      reject();
    }
  });
}
async function getLocation(array, locationArray) {
  let address;
  for (let i = 0; i < array.length; i++) {
    address = array[i].name;
    await request.get(
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
        address +
        "&key=AIzaSyCv_ReAplmTzvtLqc-z_ElXyBKbXd7-anM",
      function (err, response, body) {
        if (!err) {
          let locals = JSON.parse(body);
          let location = [
            locals.results[0].geometry.location.lat,
            locals.results[0].geometry.location.lng,
          ];
          console.log(`Location: ${location}`);
          locationArray.push(location);
        } else {
          console.log(err);
          return;
        }
      }
    );
  }
  console.log(locationArray);
  return locationArray;
}

async function getMlsLocation(array, locationArray) {
  let address;
  for (let i = 0; i < array.length; i++) {
    address = array[i];
    await request.get(
      "https://maps.googleapis.com/maps/api/geocode/json?address=" +
        address +
        "&key=AIzaSyCv_ReAplmTzvtLqc-z_ElXyBKbXd7-anM",
      function (err, response, body) {
        if (!err) {
          let locals = JSON.parse(body);
          let location = [
            locals.results[0].geometry.location.lat,
            locals.results[0].geometry.location.lng,
          ];
          console.log(location);
          locationArray.push(location);
        } else {
          console.log(err);
          return;
        }
      }
    );
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
  database: "realtor_app",
});

let server = app.listen(4545, function () {
  let host = server.address().address;
  let port = server.address().port;
});

con.connect(function (error) {
  if (error) {
    console.log(error);
  } else {
    console.log("connection successful");
  }
});

app.get("/properties", function (req, res) {
  console.log("sql props")

  con.query("SELECT * FROM properties", function (error, rows, fields) {
    if (error) console.log(error);
    else {
      let array = rows;
      for (var i in array) {
        array[i].profile_image = fs.readFileSync(
          array[i].profile_image,
          "base64"
        );
      }
      res.send(array);
      // console.log(rows);
    }
  });
});
app.get("/properties/:subString", function (req, res) {
  console.log("search properties")
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
        newArray[i].profile_image = fs.readFileSync(
          newArray[i].profile_image,
          "base64"
        );
      }
      res.send(newArray);
    }
  });
});
app.get("/locations", function (req, res) {
  console.log("sql locations")
  con.query("SELECT name FROM properties", (error, rows, fields) => {
    if (error) {
      return console.log(error);
    } else {
      let array = rows;
      for (let i = 0; i < array.length; i++) {
        array[i].name = googleApiFormatting(array[i].name);
        console.log(array[i].name)
      }
      let locationArray = [];
      getLocation(array, locationArray).then(() => {
        res.send(locationArray);
      });
    }
  });
});
app.get("/locations/:latlng", function (req, res) {
  console.log("mls locations")
  con.query("SELECT name FROM properties", (error, rows, fields) => {
    if (error) {
      return console.log(error);
    } else {
      let array = rows;
      for (let i = 0; i < array.length; i++) {
        array[i].name = googleApiFormatting(array[i].name);
      }
      let locationArray = [];
      getLocation(array, locationArray).then(() => {
        return getPostalCode(req.params.latlng);
      })
      .then((postalCode) =>{
        let temporaryArray =[];
        try {
          let index = hm.find(postalCode);
          if(index >= 0){
            JSON.parse(hm.hashedArray[index].slice(8)).forEach((property) =>{
              temporaryArray.push(googleApiFormatting(property.name));
            })
          }
          return temporaryArray;
        } catch (error) {
          throw new Error("Was not able to retrieve mls locations")
        }
      })
      .catch((e) =>{
        console.log(e);
      })
      .then((formattedAddies) =>{
        return getMlsLocation(formattedAddies, locationArray);
        // console.log(formattedAddies);
      })
      .finally(() => {
        res.send(locationArray);
      });
    }
  });
});
app.get("/mls-properties/:latlng", function (req, res) {
  console.log("mls props from " + req.params.latlng)
  getPostalCode(req.params.latlng)
    .then((postalCode) => {
      console.log(`Postal Code: ${postalCode}`);
      return getProperties(postalCode);
    })
    .then((properties) => {
      // console.log(properties);
      res.send(properties);
    });
});
