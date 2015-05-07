Accounts.passwordless = {};

if (Meteor.isClient) {
  /**
   * Request a verification code.
   * @param selector The email or username of the user
   * @param [callback]
   */
  Meteor.sendVerificationCode = function (selector, options, callback) {
    if (!callback && typeof options === 'function')
      callback = options;

    // Save the selector in a Session so even if the client reloads, the selector is stored
    Session.set('accounts-passwordless.selector', selector);
    Meteor.call('accounts-passwordless.sendVerificationCode', selector, options, callback);
  };

  /**
   * Login with the verification code.
   * @param options code The verification code. selector The username or email (optional)
   * @param [callback]
   */
  Meteor.loginWithPasswordless = function (options, callback) {
    console.log('lwpl', options);
    Accounts.callLoginMethod({
      methodArguments: [{
        selector: Session.get('accounts-passwordless.selector') || options.selector,
        code: options.code
      }],
      userCallback: callback
    });
  };

  /**
   * Set username. The user must be logged
   * @param username The name of the user
   * @param [callback]
   */
  Meteor.setUsername = function (username, callback) {
    Meteor.call('accounts-passwordless.setUsername', username, callback);
  };

}


//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////


if(Meteor.isServer) {

  Accounts.passwordless.emailTemplates = {
    from: "Meteor Accounts <no-reply@meteor.com>",
    siteName: Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, ''),

    sendVerificationCode: {
      subject: function (code) {
        return "Your verification code is " + code + " for " + Accounts.passwordless.emailTemplates.siteName;
      },
      text: function (user, code) {
        var greeting = (user && user.username) ?
              ("Hello " + user.username + ",") : "Hello,";
        return greeting + "\n"
          + "\n"
          + "Your verification code is " + code + ".\n"
          + "\n"
          + "Thanks.\n";
      }
    }
  };

  Meteor.methods({
    'accounts-passwordless.sendVerificationCode': function (selector, options) {
      check(selector, String);
      check(options, Match.Optional(Match.Any));
      Accounts.passwordless.sendVerificationCode(selector, options);
    },
    'accounts-passwordless.setUsername': function (username) {
      check(username, String);
      if(!this.userId) throw new Meteor.Error('You must be logged to change your username');
      if(username.length < 3) throw new Meteor.Error('Your username must have at least 3 characters');
      var existingUser = Meteor.users.findOne({ username: username });
      if(existingUser) throw new Meteor.Error('This username already exists');
      Meteor.users.update(this.userId, { $set: { username: username } });
    }
  });

  // Handler to login with passwordless
  Accounts.registerLoginHandler('passwordless', function (options) {
    if (options.code === undefined) return undefined; // don't handle

    check(options, {
      selector: String,
      code: String
    });

    if(!options.selector) throw new Meteor.Error('No selector setuped');

    return Accounts.passwordless.verifyCode(options.selector, options.code);
  });

  var codes = new Meteor.Collection('meteor_accounts_passwordless');

  /**
   * Send a 4 digit verification code by email
   * @param selector The email or username of the user
   */
  Accounts.passwordless.sendVerificationCode = function (selector, options) {
    var email;
    var user;
    if (selector.indexOf('@') === -1) {
      user = Meteor.users.findOne({ username: selector });
      if(!user) throw new Meteor.Error('Username \''+selector+'\' doesn\'t exists, enter your email address to create your account instead of your username.');
      if(!user.emails || user.emails.length < 1) throw new Meteor.Error('No email attached to user ' + selector);
      email = user.emails[0].address;
    } else {
      user = Meteor.users.findOne({ 'emails.address': selector });
      // If the user doesn't exists, we'll create it when the user will verify his email
      email = selector;
    }

    var code = Math.floor(Random.fraction() * 10000) + '';
    // force pin to 4 digits
    code = ('0000' + code).slice(-4);

    // Clear out existing codes
    codes.remove({ email: email });

    // Generate a new code
    codes.insert({ email: email, code: code });

    Email.send({
      to: email,
      from: Accounts.passwordless.emailTemplates.from,
      subject: Accounts.passwordless.emailTemplates.sendVerificationCode.subject(code),
      text: Accounts.passwordless.emailTemplates.sendVerificationCode.text(user, code, selector, options)
    });
  };

  // from accounts-password code
  var createUser = function (options) {
    // Unknown keys allowed, because a onCreateUserHook can take arbitrary
    // options.
    check(options, Match.ObjectIncluding({
      username: Match.Optional(String),
      email: Match.Optional(String),
    }));

    var username = options.username;
    var email = options.email;
    if (!username && !email)
      throw new Meteor.Error(400, "Need to set a username or email");

    var user = {services: {}};
    if (options.password) {
      var hashed = hashPassword(options.password);
      user.services.password = { bcrypt: hashed };
    }

    if (username)
      user.username = username;
    if (email)
      user.emails = [{address: email, verified: false}];

    return Accounts.insertUserDoc(options, user);
  };


  /**
   * Verify if the code is valid
   * @param selector The email or username of the user
   * @param code The code the user entered
   */
  Accounts.passwordless.verifyCode = function (selector, code) {
    var user;
    var email;
    if (selector.indexOf('@') === -1) {
      user = Meteor.users.findOne({ username: selector });
      if(!user) throw new Meteor.Error('Username '+selector+' doesn\'t exists, create an accounts first or login with the email');
      if(!user.emails || user.emails.length < 1) throw new Meteor.Error('No email attached to user '+selector);
      email = user.emails[0].address;
    } else {
      user = Meteor.users.findOne({ 'emails.address': selector });
      email = selector;
    }

    var validCode = codes.findOne({ email: email, code: code });
    if (!validCode) throw new Meteor.Error('Invalid verification code');

    // Clear the verification code after a succesful login.
    codes.remove({ email: email });

    var uid;
    if(user) {
      uid = user._id;
    } else {
      uid = createUser({ email: email });
      user = Meteor.users.findOne(uid);
      console.log('created user', uid, user);
    }

    if(user) {
      // Set the email as verified since he validated the code with this email
      var ve = _.find(user.emails, function (e) { return e.address === email; });
      if(ve && !ve.verified) {
        // By including the address in the query, we can use 'emails.$' in the
        // modifier to get a reference to the specific object in the emails
        // array. See
        // http://www.mongodb.org/display/DOCS/Updating/#Updating-The%24positionaloperator)
        // http://www.mongodb.org/display/DOCS/Updating#Updating-%24pull
        Meteor.users.update({ _id: uid, 'emails.address': email }, { $set: { 'emails.$.verified': true } });
      }
    }
    return { userId: uid };
  };


}
