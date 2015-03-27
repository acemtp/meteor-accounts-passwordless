meteor-accounts-passwordless
=====================

Passwords are broken. Passwordless is an open source package for token-based one-time password (OTPW) authentication, which is faster to deploy, better for your users, and more secure. Curious how it works?

Install
-------
```
meteor add acemtp:
```

Usage
-----

This package is almost isomorphic. It has only one function `extractMeta()` that returns an object containing, if found a `title`, `description`, `image`, `url`.

**On the client**, the function does a `Meteor.call()` because only the server can get the content of the url. It's async because there's no fiber on the client. So you have to pass a callback to get the answer:

    extractMeta('http://efounders.co', function (err, res) { console.log(res); });

**On the server**, the function is sync and returns the meta object:

    console.log(extractMeta('http://efounders.co'));

Both example will display something like:

    {
      description: 'eFounders is a startup Studio. Together with entrepreneurs, we turn unique ideas into successful companies. We act as the perfect co-founder to build strong and independent startups. ',
      title: 'eFounders • Startup Studio',
      image: 'http://efounders.co/public/images/630_homepage.jpg',
      url: 'http://efounders.co/'
    }
