let fs = require("fs");

class hashMap {
  constructor(linesOfFile) {
    this.linesOfFile = linesOfFile;
    this.numOfLines = linesOfFile.length;
    this.occupied = 0;
    this.hashSize = this.getHashSize(linesOfFile);
    console.log(this.hashSize)
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
    if(this.occupied >= 2 * this.numOfLines){
        this.hashMapResize()
    }
  }
  hashMapResize(){
    let tempArray = []
    this.hashedArray.forEach((element) => {
        if(element != null) {
            tempArray.push(element);
        }
    });
    //finish this
  }
  add(zipCode, data){
    let line = `${zipCode} - ${data}`;
    this.linesOfFile++;
    console.log(this.linesOfFile);
    this.hash(line);
  }
  find(zipCode){
    let zipCode = parseInt(zipCode);
    let found = false;
    let index = zipCode % this.hashSize;
    while(!found){
        if(this.hashedArray[index].slice(0,5) == zipCode.toString()){
            found == true;
            break;
        }
        else{
            if(this.hashedArray[index] == null){
                break;
            }
            index++;
        }
    }
    if(found){
        return index;
    }
    else{
        return -1;
    }
  }
  print(){
    console.log(
        `Lines of File: ${this.numOfLines}\n
        Size of Array: ${this.hashSize}\n
        Occupied: ${this.occupied}\n
        Array Elements: `, this.hashedArray
    )
  }
}

// create hashmap of file
fs.readFile("mlsProperties.txt", (err, data) => {
  linesOfFile = data.toString().split("\n");
  let hm = new hashMap(linesOfFile);
  hm.print();
});
