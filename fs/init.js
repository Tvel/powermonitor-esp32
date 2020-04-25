load('api_timer.js');
load('api_uart.js');
load('api_sys.js');
load('api_mqtt.js');
load('api_gpio.js');

//my configs
let MQTT_Id = 'prototype1';
let MQTT_MONITOR_Voltage = MQTT_Id + '/monitor/voltage';
let MQTT_MONITOR_Current = MQTT_Id + '/monitor/current';
let MQTT_MONITOR_Power = MQTT_Id + '/monitor/power';
let MQTT_MONITOR_Relay = MQTT_Id + '/monitor/relay';
let MQTT_CONTROL_Relay = MQTT_Id + '/control/relay';

let PIN_Relay = 21;
let PIN_RX = 17;
let PIN_TX = 16;

let SENSOR_ADDR_CMD = '\xB4\xC0\xA8\x01\x01\x00\x1E';
let SENSOR_PWR_CMD = '\xB2\xC0\xA8\x01\x01\x00\x1C';
//

// Configure UART at 9600 baud
let uartNo = 1;   // Uart number
UART.setConfig(uartNo, {
  baudRate: 9600,
  esp32: {
    gpio: {
      rx: PIN_RX,
      tx: PIN_TX,
    },
  },
});

// Enable Rx
UART.setRxEnabled(uartNo, true);

// Set dispatcher callback, it will be called whenver new Rx data or space in
// the Tx buffer becomes available
UART.setDispatcher(uartNo, function(uartNo) {
  let ra = UART.readAvail(uartNo);
  if (ra > 0) {

    let data = UART.read(uartNo);
    print('Received UART data:', data);
    for( let i = 0; i < data.length; i = i + 7) {
      let msg = data.slice(i, data.length);
      if(msg[0] === '\xA0') {
        let voltage = JSON.stringify(((msg.at(1) << 8) + msg.at(2))) + '.' + JSON.stringify(msg.at(3));
        let res = MQTT.pub(MQTT_MONITOR_Voltage, JSON.stringify(voltage), 1, 1);
        print('voltage is:', voltage, "Sent to mqtt:", res ? 'yes' : 'no');
      }
      if(msg[0] === '\xA1') {
        let current =  JSON.stringify(msg.at(2)) + '.' +  JSON.stringify(msg.at(3));
        let res = MQTT.pub(MQTT_MONITOR_Current, JSON.stringify(current), 1, 1);
        print('Current is:', current, "Sent to mqtt:", res ? 'yes' : 'no');
      }
      if(msg[0] === '\xA2') {
        let power = ( (msg.at(1) << 8) + msg.at(2) );
        let res = MQTT.pub(MQTT_MONITOR_Power, JSON.stringify(power), 1, 1);
        print('Power is:',  power, "Sent to mqtt:", res ? 'yes' : 'no');
      }
    }
  }
}, null);


print('Send address cmd ', SENSOR_ADDR_CMD);
UART.write(uartNo, SENSOR_ADDR_CMD);
UART.flush(uartNo);
print('Sent address cmd');


Timer.set(10000, Timer.REPEAT, function() {
  UART.write(uartNo, SENSOR_PWR_CMD);
  UART.flush(uartNo);

  print('Sent power command');
}, null);

/*
Timer.set(6000, Timer.REPEAT, function() {
  UART.write(uartNo, '\xB0\xC0\xA8\x01\x01\x00\x1A');
  UART.flush(uartNo);
  
  print('Sent voltage command');
}, null);

Timer.set(7000, Timer.REPEAT, function() {
  UART.write(uartNo, '\xB1\xC0\xA8\x01\x01\x00\x1B');
  UART.flush(uartNo);

  print('Sent current command');
}, null);
*/

MQTT.sub(MQTT_CONTROL_Relay, function(conn, topic, msg) {
  print('Topic:', topic, 'message:', msg);
  if(msg === '1') {
    GPIO.write(PIN_Relay, 1);
    MQTT.pub(MQTT_MONITOR_Relay, msg, 1, 1);
  }
  if(msg === '0') {
    GPIO.write(PIN_Relay, 0);
    MQTT.pub(MQTT_MONITOR_Relay, msg, 1, 1);
  }
}, null);


GPIO.setup_output(PIN_Relay, 1);
MQTT.pub(MQTT_MONITOR_Relay, JSON.stringify(1), 1, 1);