/*
  Auhtor: Kristiyan Doykov
  Student No.: 170780410
  Purpose: The following script displays the information about the IOTA node which
  the device is connected to and sends AES-encrypted data coming from the DHT11 
  sensor to the IOTA Tangle by a given index. The AES encryption type is 
  determined by the length of the key.
  Last Updated: 01 April 2022 
 */

const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const moment = require('moment');
const CryptoJS = require('crypto-js');

const { ClientBuilder } = require('@iota/client');
const { node, arduinoSerialPort, SENSOR_DATA_MESSAGE_INDEX, DATA_SECRET } =
  process.env;

const client = new ClientBuilder().node(node).build();

client.getInfo().then(console.log).catch(console.error);

const serial = new SerialPort({
  baudRate: 9600,
  autoOpen: true,
  path: arduinoSerialPort,
});

const parser = serial.pipe(new ReadlineParser({ delimiter: '\r\n' }));

// Publish to tangle
const publish = async (packet) => {
  const stringPayload = JSON.stringify(packet);

  const ciphertext = CryptoJS.AES.encrypt(
    stringPayload,
    DATA_SECRET
  ).toString();

  const MessageSender = client.message();

  const messageId = await MessageSender.index(SENSOR_DATA_MESSAGE_INDEX)
    .data(ciphertext)
    .submit();

  console.log('Message ID: ', messageId);
};

// Serial port library events
serial.on('open', showPortOpen);
parser.on('data', readSerialData);
serial.on('close', showPortClose);
serial.on('error', showError);

// Callback functions
function showPortOpen() {
  console.log('Serial port open. Data rate: ' + serial.baudRate + '\n');
}

async function readSerialData(data) {
  console.log('Read serial data.\n');

  let json = {};

  const dateTime = moment().utc().format('DD/MM/YYYY hh:mm:ss');
  json['dateTime'] = dateTime;
  json['sensor'] = 'DHT11';
  json['temperature'] = data.split(',')[0].split(':')[1].trim();
  json['humidity'] = data.split(',')[1].split(':')[1].trim();

  publish(json);

  console.log('json = ', json);
}

function showPortClose() {
  console.log('Serial port closed.\n');
}

function showError(error) {
  console.log('Serial port error: ' + error + '\n');
}
