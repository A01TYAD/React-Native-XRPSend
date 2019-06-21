'use strict';
import React, {Component} from 'react';
import {Platform, StyleSheet} from 'react-native';
import SendTransaction from './src/SendTransaction'
//import TransactionHistory from './src/TransactionHistory'

export default class App extends React.Component {
  render() {
    return <SendTransaction/>;
  }
}
