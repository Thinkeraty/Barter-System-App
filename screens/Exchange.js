import React, { Component } from 'react';
import { View, StyleSheet, Text, TextInput,KeyboardAvoidingView,TouchableOpacity,Alert, ToastAndroid } from 'react-native';
import * as firebase from 'firebase'
import 'firebase/firestore';
import db from '../config';
import MyHeader from '../components/MyHeader'

export default class Exchange extends Component{

  constructor(){
    super()
    this.state = {
      email : firebase.auth().currentUser.email,
      itemName : "",
      description : "",
      requestedItemName:"",
      exchangeId:"",
      itemStatus:"",
      docId: "",
      itemValue:"",
      currencyCode:""
    }
  }

  createUniqueId(){
    return Math.random().toString(36).substring(7);
  }

  addItem=(itemName, description)=>{
    var email = this.state.email
    exchangeId = this.createUniqueId()
    db.collection('exchange_requests').add({
      'username' : email,
      'item_name': itemName,
      'description' : description,
      'exchangeId'  : exchangeId,
      "item_status" : "requested",
      "item_value"  : this.state.itemValue,
      "date"       : firebase.firestore.FieldValue.serverTimestamp()
     })
     .catch(function(error) {
        console.error("Error adding document: ", error);
    });

    this.getExchangeRequest()
     db.collection('Users').where("user_email","==",email).get()
      .then()
      .then((snapshot)=>{
        snapshot.forEach((doc)=>{
          db.collection('Users').doc(doc.id).update({
        IsExchangeRequestActive: true
        })
      })
    })
    
     this.setState({
       itemName : '',
       description :'',
       itemValue: ""
     })

     
     return Alert.alert(
          'Item ready to exchange',
          '',
          [
            {text: 'OK', onPress: () => {

            }}
          ]
      );
  }

    getIsExchangeRequestActive(){
      db.collection('Users')
      .where('user_email','==',this.state.email)
      .onSnapshot(querySnapshot => {
        querySnapshot.forEach(doc => {
          this.setState({
            IsExchangeRequestActive:doc.data().IsExchangeRequestActive,
            userDocId : doc.id,
            currencyCode: doc.data().currency_code
          })
        })
      })
    }

    getExchangeRequest =()=>{
    db.collection('exchange_requests')
      .where('username','==',this.state.email)
      .get()
      .then((snapshot)=>{
        snapshot.forEach((doc)=>{
          if(doc.data().item_status !== "received"){
            this.setState({
              exchangeId : doc.data().exchangeId,
              requestedItemName: doc.data().item_name,
              itemStatus:doc.data().item_status,
              itemValue : doc.data().item_value,
              docId     : doc.id
            })
          }
        })
    })
  }

  getValue(){
    fetch("http://data.fixer.io/api/latest?access_key=30b9d3f9fc3e897b82537e51076e261f&format=1")
    .then(response=>{
      return response.json();
    }).then(responseData =>{
      var currencyCode = this.state.currencyCode
      var currency = responseData.rates.INR
      var value =  69 / currency
      console.log(value);
    })
    }

  componentDidMount(){
    this.getExchangeRequest()
    this.getIsExchangeRequestActive()
    this.getValue()
  }

  receivedItem=(itemName)=>{
    var userId = this.state.email
    var exchangeId = this.state.exchangeId
    db.collection('received_items').add({
        "user_id": userId,
        "item_name":itemName,
        "exchange_id"  : exchangeId,
        "itemStatus"  : "received",

    })
  }

  updateExchangeRequestStatus=()=>{
    db.collection('requested_requests').doc(this.state.docId)
    .update({
      item_status : 'recieved'
  })

  db.collection('Users').where('user_email','==',this.state.email).get()
    .then((snapshot)=>{
      snapshot.forEach((doc) => {
        //updating the doc
        db.collection('Users').doc(doc.id).update({
          IsExchangeRequestActive: false
        })
      })
    })

}

  sendNotification=()=>{
    //to get the first name and last name
    db.collection('Users').where('user_email','==',this.state.email).get()
    .then((snapshot)=>{
      snapshot.forEach((doc)=>{
        var name = doc.data().first_name
        var lastName = doc.data().last_name

        // to get the donor id and item name
        db.collection('all_notifications').where('exchangeId','==',this.state.exchangeId).get()
        .then((snapshot)=>{
          snapshot.forEach((doc) => {
            var donorId  = doc.data().donor_id
            var itemName =  doc.data().item_name

            //targert user id is the donor id to send notification to the user
            db.collection('all_notifications').add({
              "targeted_user_id" : donorId,
              "message" : name +" " + lastName + " received the item " + itemName ,
              "notification_status" : "unread",
              "item_name" : itemName
            })
          })
        })
      })
    })
  }

  render(){
    
      if (this.state.IsExchangeRequestActive === true){
       
        return(
          <View style = {{flex:1,justifyContent:'center'}}>
          <MyHeader title="Barter App" navigation ={this.props.navigation}/>
           <View style={{borderColor:"orange",borderWidth:2,justifyContent:'center',alignItems:'center',padding:10,margin:10}}>
           <Text>Item Name</Text>
           <Text>{this.state.requestedItemName}</Text>
           </View>
           <View style={{borderColor:"orange",borderWidth:2,justifyContent:'center',alignItems:'center',padding:10,margin:10}}>
           <Text> Item Value </Text>

           <Text>{this.state.itemValue}</Text>
           </View>
           <View style={{borderColor:"orange",borderWidth:2,justifyContent:'center',alignItems:'center',padding:10,margin:10}}>
           <Text> Item Status </Text>
  
           <Text>{this.state.itemStatus}</Text>
           </View>
  
           <TouchableOpacity style={{borderWidth:1,borderColor:'orange',backgroundColor:"orange",width:300,alignSelf:'center',alignItems:'center',height:30,marginTop:30}}
           onPress={()=>{
             this.sendNotification()
             this.updateExchangeRequestStatus();
             this.receivedItem(this.state.requestedItemName)
           }}>
           <Text>I recieved the Item</Text>
           </TouchableOpacity>
         </View>
       )
  
      }
      else {
    return(
      <View style={{flex:1}}>
      <MyHeader title="Barter App" navigation ={this.props.navigation}/>
      <KeyboardAvoidingView style={{flex:1,justifyContent:'center', alignItems:'center'}}>
        <TextInput
          style={styles.formTextInput}
          placeholder ={"Item Name"}
          maxLength ={10}
          onChangeText={(text)=>{
            this.setState({
              itemName: text
            })
          }}
          value={this.state.itemName}
        />
        <TextInput
          multiline
          numberOfLines={4}
          style={[styles.formTextInput,{height:100}]}
          placeholder ={"Description"}
          onChangeText={(text)=>{
            this.setState({
              description: text
            })
          }}
          value={this.state.description}

        />
        <TextInput
            style={styles.formTextInput}
            placeholder ={"Item Value"}
            maxLength ={8}
            onChangeText={(text)=>{
              this.setState({
                itemValue: text
              })
            }}
            value={this.state.itemValue}
          />
        <TouchableOpacity
          style={[styles.button,{marginTop:10}]}
          onPress = {()=>{this.addItem(this.state.itemName, this.state.description)}}
          >
          <Text style={{color:'#ffff', fontSize:18, fontWeight:'bold'}}>Add Item</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
      </View>
    )
  }
}
}


const styles = StyleSheet.create({
  formTextInput:{
    width:"75%",
    height:50,
    alignSelf:'center',
    borderColor:'blue',
    borderRadius:10,
    borderWidth:1,
    marginTop:20,
    padding:10
  },
  button:{
    width:"75%",
    height:50,
    justifyContent:'center',
    alignItems:'center',
    borderRadius:10,
    backgroundColor:"#ff5722",
    shadowColor: "#000",
    shadowOffset: {
       width: 0,
       height: 8,
    },
    shadowOpacity: 0.44,
    shadowRadius: 10.32,
    elevation: 16,
  },

})