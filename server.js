var mosca = require("mosca");
var path = require("path");
const { Reader } = require("@tanjaae/thaismartcardreader");
const myReader = new Reader();
var figlet = require('figlet');
var moscaSettings = {
  port: 11883,
  http: {
    port: 18080
  }
};


figlet.text('NAPHATTHARAWAT!', {
  // font: 'Ghost',
  horizontalLayout: 'default',
  verticalLayout: 'default',
  width: 100,
  whitespaceBreak: true
}, function(err, data) {
  console.log(data);
  console.log("=============================================");
});


var server = new mosca.Server(moscaSettings); //here we start mosca
server.on("ready", setup); //on init it fires up setup()

// fired when the mqtt server is ready
function setup() {
  // server.authenticate = authenticate;
  console.log("Mosca server is up and running (auth)");
}

var authenticate = function(client, username, password, callback) {
  // var mqttUser = process.env.MQTT_USER || 'q4u';
  // var mqttPassword = process.env.MQTT_PASSWORD.toString() || '##q4u##';

  // var authorized = (username === mqttUser && password.toString() === mqttPassword);
  // if (authorized) client.user = username;
  callback(null, authorized);
};

server.on("clientConnected", function(client) {
  console.log("Client Connected:", client.id);
});

// fired when a client disconnects
server.on("clientDisconnected", function(client) {
  console.log("Client Disconnected:", client.id);
});

server.on("published", function(packet, client) {
  // console.log(packet);
  console.log("Published", packet.payload.toString());
});
process.on("unhandledRejection", reason => {
  console.log("From Global Rejection -> Reason: " + reason);
});

console.log("Waiting For Device !");

myReader.on("device-activated", async event => {
  console.log("Device-Activated");
  console.log(event.name);
  console.log("=============================================");
});

myReader.on("error", async err => {
  console.log(err);
});

myReader.on("image-reading", percent => {
  console.log(percent);
});

myReader.on("card-removed", err => {
  console.log("== card remove ==");
  var packet = {
    topic: "card-remove",
    payload: "card-remove",
    qos: 0,
    retain: false
  };
  server.publish(packet);
});

myReader.on("card-inserted", async person => {
  // console.log(person);
  const cid = await person.getCid();
  const thName = await person.getNameTH();
  const dob = await person.getDoB();
  const address = await person.getAddress();
  const splitAddress = address.split("#");
  const objAddress = {
    houseNo: splitAddress[0],
    moo: (splitAddress[1].startsWith("หมู่ที่")
      ? splitAddress[1].substring(7)
      : ""
    ).trim(),
    soi: (splitAddress[1].startsWith("ซอย")
      ? splitAddress[1].substring(3)
      : ""
    ).trim(),
    street: splitAddress
      .slice(2, -3)
      .join(" ")
      .trim(),
    subdistrict: splitAddress[splitAddress.length - 3].substring(4).trim(),
    district:
      splitAddress[splitAddress.length - 2].substring(0, 3) == "เขต"
        ? splitAddress[splitAddress.length - 2].substring(3).trim()
        : splitAddress[splitAddress.length - 2].substring(5).trim(),
    province: splitAddress[splitAddress.length - 1].substring(7).trim(),
    full: splitAddress.reduce((addr, d) => {
      if (d.length === 0) {
        return addr;
      }
      return `${addr} ${d}`;
    }, "")
  };

  console.log(`CitizenID: ${cid}`);
  console.log(
    `THName: ${thName.prefix} ${thName.firstname} ${thName.lastname}`
  );
  console.log(`DOB: ${dob.day}/${dob.month}/${dob.year}`);
  console.log(`Address: ${objAddress.full}`);
  console.log("=============================================");
  const obj = {
    cid: cid,
    title_name: thName.prefix,
    first_name: thName.firstname,
    last_name: thName.lastname,
    date_of_birth: `${dob.year}-${dob.month}-${dob.day}`,
    address:objAddress
  };
  var packet = {
    topic: "card-insert",
    payload: JSON.stringify(obj),
    qos: 0,
    retain: false
  };
  server.publish(packet);
});

myReader.on("device-deactivated", () => {
  console.log("device-deactivated");
});
