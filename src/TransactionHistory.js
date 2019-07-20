'use strict';
import React, {Component} from 'react';
import {Platform, StyleSheet, Text, View, Button} from 'react-native';
import AsyncStorage from '@react-native-community/async-storage';
import { createStackNavigator, createAppContainer } from "react-navigation";
const ripple = require('../ripple');

export default class TransactionHistory extends React.Component {
    render() {
      return ( 
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Text>Transaction History</Text>
        </View> 
      );
    }
  }
