//###############################################################################
//##
//# Copyright (C) 2014-2015 Andrea Rocco Lotronto
//##
//# Licensed under the Apache License, Version 2.0 (the "License");
//# you may not use this file except in compliance with the License.
//# You may obtain a copy of the License at
//##
//# http://www.apache.org/licenses/LICENSE-2.0
//##
//# Unless required by applicable law or agreed to in writing, software
//# distributed under the License is distributed on an "AS IS" BASIS,
//# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//# See the License for the specific language governing permissions and
//# limitations under the License.
//##
//###############################################################################

var WebSocketClient = require('websocket').client;
var net = require("net");

var bindSockets = require("./bindSockets_reverse");

wst_client_reverse = function(wsClientConfig) {
  this.wsClientForControll = new WebSocketClient(wsClientConfig);
}

wst_client_reverse.prototype.start = function(portTunnel, wsHostUrl, remoteAddr, payload, hostId) {
  //Getting paramiter
  var _ref1 = remoteAddr.split(":"), remoteHost = _ref1[0], remotePort = _ref1[1];

  //Connection to Controll WS Server
  var headers = {
    port: portTunnel,
    payload: JSON.stringify(payload),
    hostid: hostId,
  };

  // Connect
  var connect = function() {
    this.wsClientForControll.connect(wsHostUrl + '/create', 'tunnel-protocol', null, headers);
  }
  connect.call(this);

  // Add a bound method to be able to retry the connection if it fails/is lost
  this.retryConnect = connect.bind(this);

  this.wsClientForControll.on('connect', (function(_this){
    return function(wsConnectionForControll) {
      //console.log('wsClientForControll for  Controll connected');
      wsConnectionForControll.on('message', function(message) {
        //Only utf8 message used in Controll WS Socket
        //DEBUG MESSAGE FOR TESTING
        //console.log("Message for new TCP Connectio on WS Server");
          
        var parsing = message.utf8Data.split(":");

        //Managing new TCP connection on WS Server
        if (parsing[0] === 'NC'){

          //Identification of ID connection
          var idConnection = parsing[1];
  
          // Connect to TCP server
          var tcpConn = net.connect({port: remotePort, host: remoteHost});

          tcpConn.on("connect", function(){
            tcpConn.pause();
            this.wsClientData = new WebSocketClient();
            this.wsClientData.connect(wsHostUrl + '/connect', 'tunnel-protocol', null, {id: idConnection});
            //DEBUG MESSAGE FOR TESTING
            //console.log("Call WS-Server for connect id::"+parsing[1]);

            //Management of new WS Client for every TCP connection on WS Server
            this.wsClientData.on('connect', function(wsConnectionForData) {
              //console.log("Connected wsClientData to WS-Server for id "+parsing[1]+" on localport::"+wsConnectionForData.socket.localPort);
              console.log("Start PIPE wsConnectionForData TCP client to :"+remoteHost+":"+remotePort);

              bindSockets(wsConnectionForData, tcpConn);
              //Resume the TCP Socket after the connection to WS Server
              tcpConn.resume();
            });
          });
        }
      });
    }
  })(this));
  
  //Management of WS Connection failed
  this.wsClientForControll.on('connectFailed', function(error) {
    console.log('WS connect error: ' + error.toString());
  });

};

module.exports = wst_client_reverse;
