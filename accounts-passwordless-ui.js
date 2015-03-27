// set to false to skip the form asking the username
var loginPasswordlessAskUsername = true;

Session.setDefault('loginPasswordlessMessage', '');
Session.setDefault('loginPasswordlessState', 'loginPasswordlessLogin');

Tracker.autorun(function () {
  var user = Meteor.user();
  if(user) {
    if(user.username || !loginPasswordlessAskUsername)
      Session.set('loginPasswordlessState', 'loginPasswordlessLogout');
    else
      Session.set('loginPasswordlessState', 'loginPasswordlessAskUsername');
  }
});

///

Template.registerHelper('loginPasswordlessMessage', function () {
  return Session.get('loginPasswordlessMessage');
});

Template.loginPasswordless.helpers({
  loginPasswordlessState: function () {
    return Session.get('loginPasswordlessState');
  }
});

Template.loginPasswordlessLogin.events({
  'submit #loginPasswordlessLogin': function (event) {
    var selector = event.target.selector.value;
    console.log('login', selector);
    Meteor.sendVerificationCode(selector, function (err, res) {
      console.log('sendVerificationCode answered', arguments);
      if(err)
        Session.set('loginPasswordlessMessage', err.error);
      else {
        Session.set('loginPasswordlessMessage', '');
        Session.set('loginPasswordlessState', 'loginPasswordlessVerify');
      }
    });
    return false;
  }
});

///

Template.loginPasswordlessVerify.events({
  'submit #loginPasswordlessVerify': function (event) {
    var code = event.target.code.value;
    console.log('verify', code);
    Meteor.loginWithPasswordless({ code: code }, function (err, res) {
      console.log('loginWithPasswordless answered', arguments);
      if(err)
        Session.set('loginPasswordlessMessage', err.error);
      else {
        Session.set('loginPasswordlessMessage', '');
        if(loginPasswordlessAskUsername && !Meteor.user().username)
          Session.set('loginPasswordlessState', 'loginPasswordlessAskUsername');
        else
          Session.set('loginPasswordlessState', 'loginPasswordlessLogout');
      }
    });
    return false;
  },
  'click #loginPasswordlessVerifyBack': function (event) {
    Session.set('loginPasswordlessMessage', '');
    Session.set('loginPasswordlessState', 'loginPasswordlessLogin');
  },
});

///

Template.loginPasswordlessAskUsername.events({
  'submit #loginPasswordlessAskUsername': function (event) {
    var username = event.target.username.value;
    console.log('username', username);
    Meteor.setUsername(username, function (err, res) {
      console.log('setUsername answered', arguments);
      if(err)
        Session.set('loginPasswordlessMessage', err.error);
      else {
        Session.set('loginPasswordlessMessage', '');
        Session.set('loginPasswordlessState', 'loginPasswordlessLogout');
      }
    });
    return false;
  }
});


///

Template.loginPasswordlessLogout.helpers({
  loginPasswordlessUserInfo: function () {
    var user = Meteor.user();
    if(!user) return '';
    if(user.username) return user.username;
    else if(user.emails && user.emails.length > 0) return user.emails[0].address;
    else return user._id;
  }
});

Template.loginPasswordlessLogout.events({
  'submit #loginPasswordlessLogout': function (event) {
    console.log('logout');
    Meteor.logout(function (err, res) {
      console.log('logout answered', arguments);
      if(err)
        Session.set('loginPasswordlessMessage', err.error);
      else {
        Session.set('loginPasswordlessMessage', '');
        Session.set('loginPasswordlessState', 'loginPasswordlessLogin');
      }
    });
    return false;
  }
});
