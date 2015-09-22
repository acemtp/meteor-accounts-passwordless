# meteor-accounts-passwordless

Passwords are broken. Passwordless is an open source Meteor package for token-based one-time password (OTPW) authentication, which is faster to deploy, better for your users, and more secure.

## Install

```
meteor add acemtp:accounts-passwordless
```

## Usage


You have 2 ways to use it, the highlevel that use the default ui or the low level to plug on your own application.

### Default UI

This is the easiest way to use the package. Add this line in a template and voila:

    {{> loginPasswordless}}

This is how it's done on the [live demo](http://passwordless.meteor.com). The source code of this example is on [Github](https://github.com/efounders/meteor-accounts-passwordless/tree/master/example).

### Low Level API

If the default layout doesn't fit your needs, you can call the low level api. You can copy how it's made on the [default ui source file](https://github.com/efounders/meteor-accounts-passwordless/blob/master/accounts-passwordless-ui.js).

Basically, there're 3 methods you have to call on the client:

#### Meteor.sendVerificationCode(selector, callback)

Call this one will send the verification code to the user.

The `selector` can be the email of the user or his username. If you pass the username, the accounts must already exists to find the associate email and send the email.

The callback has 2 parameters, `error` and `result`.

#### Meteor.loginWithPasswordless(options, callback)

options is an object that must contain the `code` entered by the user after he read the email. It can also contains `selector` that was the selector used at the `Meteor.sendVerificationCode` step.

That's all you need to log in a user with passwordless.

#### Meteor.setUsername(username, callback)

You don't have to call this function. It's just an utility function to set the username of the logged user, in case you don't want to display the user email.

#### Workflow

Here is the minimal workflow you have to implement:

- ask the user his email or username
- call `Meteor.sendVerificationCode` with the value given by the user
- ask the user his verification code sent by email
- call `Meteor.loginWithPasswordless` with the verification code
- the user is logged

Some optional extra steps:

- (optional) ask the user his username and call `Meteor.setUsername` with the value given by the user
- (optional) call `Meteor.logout()` to logout the user

#### Set a link in the email

To set a link inside the email you can modifier the `emailTemplates` object to use custom texte and so add a link. Below you get an example:

```javascript
Meteor.startup(function () {

  Accounts.passwordless.emailTemplates.sendVerificationCode = {
    subject: function (code) {
      return "Your verification code is " + code + " for " + Accounts.passwordless.emailTemplates.siteName;
    },
    text: function (user, code, selector, options) {

      var greeting = (user && user.username) ? ("Hello " + user.username + ",") : "Hello,";

      var loginURL = Meteor.absoluteUrl().replace(/^https?:\/\//, '').replace(/\/$/, '') + '/login/';
      loginURL += encodeURIComponent(selector) + '/' + code;

      if (options && options.length == 2) {
        // options come from client and must be checked
        check(options[0], String);
        check(options[1], String);
        loginURL +=  '/' + options[0] + '/' + options[1];
      }

      return greeting + "\n"
        + "\n"
        + "Your verification code is " + code + ".\n"
        + "You can login directly by clicking this <a href='" + loginURL + "'>link</a>\n"
        + "\n"
        + "Thanks.\n";
    }
  };
});
```

After you have to set a root to get email/username and code, to login the user. Look example code below for an example with iron:router

```
Router.route('/login/:selector/:code', function () {
  //
  var options = {
    code: this.params.code,
    selector: decodeURIComponent(this.params.selector)
  };
  
  Meteor.loginWithPasswordless(options, function (error, result) {
      if (error) {
        console.error(error);
      } else {
        // redirect user to your main page.
        Router.go('dashboard');
      }
    });
});
```

### Test the example locally on your computer

- git clone https://github.com/efounders/meteor-accounts-passwordless.git
- cd meteor-accounts-passwordless/example
- meteor
- then open a browser to [http://localhost:3000](http://localhost:3000)
- since the email is not configured by default on your computer, the email (verification code) will be displayed on the server console.
