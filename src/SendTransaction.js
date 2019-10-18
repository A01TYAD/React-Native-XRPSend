'use strict';
import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View, Button, Alert, TextInput} from 'react-native';
import Snackbar from 'react-native-snackbar';
import { createStackNavigator, createAppContainer } from "react-navigation";
const ripple = require('../ripple');

var xrplServer = 'wss://testnet.xrpl-labs.com'//'wss://s.altnet.rippletest.net:51233'
var fee = 0;
var xrpAmount = 0;
var memo = null;
var signed_tx = null;
var tx_at_ledger = 0;
var tx_result = null;
var tx_info = null;
var tranxID = null; 
var tranxBlob = null; 
var tranxMemo = null;
const maxLedgerVersionOffset = 15;
var checkTxStatus = 0;
var maxLedgerVersion;
var earliestLedgerVersion=0;
var destinationTag = null;
var sender = null;
var destAddress = null;
var secretKey = null;

const api = new ripple.RippleAPI({
  server: xrplServer // just a test server Not a Public rippled server hosted by Ripple, Inc.
});

api.on('error', (errorCode, errorMessage) => {
    Snackbar.show({
      title:errorCode + ': ' + errorMessage,
      duration: Snackbar.LENGTH_SHORT,
   });
   console.log(errorCode + ': ' + errorMessage)
});

api.on('connected', () => {
    console.log('Connected to XRPL');
});

api.on('disconnected', (code) => {
    // code - [close code](https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent) sent by the server
    // will be 1000 if this was normal closure
    Snackbar.show({
       title: 'Disconnected, code: '+ code,
       duration: Snackbar.LENGTH_SHORT,
    });
    console.log('Disconnected from XRPL');
});

api.on('ledger', ledger => {
  console.log("Ledger version", ledger.ledgerVersion, "was just validated.")
  if (ledger.ledgerVersion < maxLedgerVersion && ledger.ledgerVersion>earliestLedgerVersion) {
    if(earliestLedgerVersion !==0 ){         //if the value has not been reset
      txStatus(tranxID, earliestLedgerVersion);
    }
  }else if(ledger.ledgerVersion > maxLedgerVersion && checkTxStatus==0){
      Alert.alert("Transaction failed, Please go back try again.");
      //resetting max ledgerVersion temporarily for next transaction if previous has passed.
      maxLedgerVersion = ledger.Version + 1000;
      console.log('Transaction failed. Ledger version greater than Maxmimum Ledger Version.')
      api.disconnect();
   }
})

function startTranx(navigate){
  if(xrpAmount==null || xrpAmount==0){
      Alert.alert("Destination and Amount cannot be epmty!");
  }else{
      api.connect().then(() => {
        api.getServerInfo().then(function(server) {
          fee = server.validatedLedger.baseFeeXRP;
          Snackbar.show({
              title: 'Connected to XRPL, Server Base Fee is: ' + fee + ' XRP',
              duration: Snackbar.LENGTH_LONG,
          });
          navigate('Confirm');
        });
      }).then(() => {
      }).catch(console.error)
  }    
}
async function doPrepare(navigate) {
      const preparedTx = await api.prepareTransaction({
        "TransactionType": "Payment",
        "Account": sender,
        "Amount": api.xrpToDrops(xrpAmount), // Same as "Amount": "22000000" if 22 is entered.
        "Memos": [
          {
              "Memo": {
                  "MemoData": toHex(tranxMemo)
              }
          }
        ],
        "Destination": destAddress,
        "DestinationTag": destinationTag
      }, {
        // Expire this transaction if it doesn't execute within ~5 minutes:
        "maxLedgerVersionOffset": 15
      })
      const maxLedgerVersion = preparedTx.instructions.maxLedgerVersion;
      tx_info = preparedTx.txJSON;
      const tx_fee_info = preparedTx.instructions.fee
      console.log("Prepared transaction instructions:", preparedTx.txJSON)
      console.log("Transaction expires after ledger:", maxLedgerVersion)

      const response = api.sign(preparedTx.txJSON, secretKey);
      const txID = response.id;
      tranxID = txID;
      const txBlob = response.signedTransaction;
      earliestLedgerVersion=0;
      doSubmit(txBlob, navigate);
      
    }

async function doSubmit(txBlob, navigate) {
      const latestLedgerVersion = await api.getLedgerVersion()
      checkTxStatus = 0;
      const result = await api.submit(txBlob);
      //Alert.alert("Tentative result code:"+ result.resultCode + "\n Tentative result message:" + result.resultMessage);
      if (result.resultCode == 'tesSUCCESS'){
        console.log('Transaction Sucessfully sent to server for validation.')
        Snackbar.show({
          title:'Transaction Sucessfully sent to server for validation.',
          duration: Snackbar.LENGTH_SHORT,
       });
       navigate('Send');
      }else{
        console.log('Tentative result message: ',result.resultCode);
      }

      // Return the earliest ledger index this transaction could appear in
      // as a result of this submission, which is the first one after the
      // validated ledger at time of submission.
       earliestLedgerVersion = latestLedgerVersion + 1;
       maxLedgerVersion = earliestLedgerVersion + maxLedgerVersionOffset;
       
    }
    
async function txStatus(txID, earliestLedgerVersion, isUnderMaxLedgerLimit){
    try {
      const tx = await api.getTransaction(txID, {minLedgerVersion: earliestLedgerVersion})
      if(tx.outcome.result == 'tesSUCCESS' && checkTxStatus == 0){
        checkTxStatus = 1;
        earliestLedgerVersion = 0;
        Alert.alert("Transaction Validated Succesfully!");
        console.log("Transaction result:", tx.outcome.result);
        console.log("Balance changes:", JSON.stringify(tx.outcome.balanceChanges));
        api.disconnect();
      }
    } catch(error) {
      console.log("Couldn't get transaction outcome. Transaction not validated yet.", error);
  }
}

function toHex(str) {
	var hex = '';
	for(var i=0;i<str.length;i++) {
		hex += ''+str.charCodeAt(i).toString(16);
	}
	return hex.toUpperCase();
}

//---------------------------------------------------------------------------

export default class SendTransaction extends React.Component {
  render() {
    return <AppContainer/>;
  }
}

class SendScreen extends React.Component {
  static navigationOptions = {
    title: 'Send XRP',
    headerStyle: {
      backgroundColor: '#1e90ff',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  };
  render() {
    return (
      <View style={styles.container}>
        <TextInput 
            style={styles.textInput}
            placeholder="Your address*"
            returnKeyLabel = {"next"}
            onChangeText={function(text){
                sender = text;
            }}
        />
        <TextInput 
            style={styles.textInput}
            placeholder="Destination addres*"
            returnKeyLabel = {"next"}
            onChangeText={function(text){
                destAddress = text;
            }}
        />
        <TextInput 
            style={styles.textInput}
            placeholder="Destination Tag"
            returnKeyLabel = {"next"}
            onChangeText={function(text){
                destinationTag = text;
            }}
        />
        <TextInput 
            style={styles.textInput}
            placeholder="XRP Amount*"
            returnKeyLabel = {"next"}
            onChangeText={function(text){
                xrpAmount= text;
            }}
        />
        <TextInput 
            style={styles.textInput}
            placeholder="Message"
            returnKeyLabel = {"next"}
            onChangeText={function(text){
                tranxMemo= text;
            }}
        />
        <TextInput 
            style={styles.textInput}
            placeholder="Secret Key*"
            returnKeyLabel = {"next"}
            onChangeText={function(text){
                secretKey= text;
            }}
        />
        <View style={styles.buttonContainer}>
          <Button
                onPress={() => {
                  if(xrpAmount==null || xrpAmount==0){
                    Alert.alert("Destination and Amount cannot be epmty!");
                }else{
                    const { navigate } = this.props.navigation;
                    startTranx(navigate);
                    
                }
                }}
                title="SEND"
           />
        </View>
      </View>
    );
  }
}

//--------------------------------------------------------------------------------------------

class ConfirmScreen extends React.Component {

  static navigationOptions = {
    title: 'Confirm Transaction',
    headerStyle: {
      backgroundColor: '#1e90ff',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  };

  state = {
    destination: destAddress,
    source: sender,
    amount: xrpAmount,
    earliestLedger: earliestLedgerVersion,
    txID: tranxID,
    txInfo : tx_info,
    txFee: fee,
    txBlob: tranxBlob,
    txMemo: tranxMemo,
    txDestTag: destinationTag
  }
  
  render() {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <Text style={styles.transactionInfo}>Amount(XRP): { this.state.amount }</Text>
        <Text style={styles.transactionInfo}>Sender: { this.state.source }</Text>
        <Text style={styles.transactionInfo}>Destination Tag: { this.state.txDestTag }</Text>
        <Text style={styles.transactionInfo}>Reciever: { this.state.destination }</Text>
        <Text style={styles.transactionInfo}>Transaction Fee: ~{ this.state.txFee }</Text>
        <Text style={styles.transactionInfo}>Memo: { this.state.txMemo }</Text>
        <View style={{flexDirection:'row'}}>
          <View style={styles.buttonContainer}>
            <Button
                  onPress={() => {
                    const { navigate } = this.props.navigation;
                    doPrepare(navigate)
                  }}
                  title="Confirm"
            />
          </View>
          <View style={styles.buttonContainer}>
            <Button
                  onPress={() => {
                    this.props.navigation.navigate('Send');
                    api.disconnect();
                  }}
                  title="Back"
            />
          </View>
        </View>
      </View>
    );
  }
}

const AppStackNavigator = createStackNavigator({
  Send:{ screen: SendScreen},
  Confirm:{ screen: ConfirmScreen}
},
{
  initialRouteName: 'Send',
  headerLayoutPreset: 'center',
});
const AppContainer = createAppContainer(AppStackNavigator);

//----------------------------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5FCFF',
  },
  buttonContainer: {
    margin: 20,
    width: 100,
    backgroundColor: '#1e90ff'
  },
  welcome: {
    fontSize: 20,
    textAlign: 'center',
    margin: 10,
  },
  textInput: {
    fontSize: 20,
    alignSelf: 'stretch',
    backgroundColor: '#DCDCDC',
    borderColor: '#000000',
    borderRadius: 10,
    textAlign: 'center',
    margin: 10,
  },
  instructions: {
    textAlign: 'center',
    color: '#333333',
    marginBottom: 5,
  },
  transactionInfo: {
    paddingTop:10, 
    paddingBottom: 10,
     paddingRight: 10, 
     paddingLeft: 10
  },
});

//-----------------------------------------------------------------------------------------------
