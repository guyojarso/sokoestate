var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var flash = require('connect-flash');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
var session = require('express-session');
var cookieSession = require('cookie-session');
var bodyParser = require('body-parser');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
var FacebookStrategy = require('passport-facebook');
const { check, validationResult } = require('express-validator/check');
const { matchedData, sanitize } = require('express-validator/filter');

//ROUTES
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var categoryRouter = require('./routes/category');
var adminRouter = require('./routes/admin');
var propertyRouter = require('./routes/property');
var config = require('./config.json');

//Models
var User = require('./models/User');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
app.use(cookieSession({
  name: 'session',
  keys: ['m@ckl3mor3!sth#b0mb'],

  // Cookie Options
  //maxAge: 7 * 24 * 60 * 60 * 1000 // 24 hours
}))

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id).then(function(user){
    done(null, user);
  });
});


passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password'
  },
  function(username, password, done) {
    User.findOne({ 'username': username }).then(function(user){
      if (!user) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      if (!bcrypt.compareSync(password, user.password)) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user);
    }).catch(function(err){
      console.log(err);
    });
  }
));


passport.use(new GoogleStrategy({
    clientID: config.google.clientId,
    clientSecret: config.google.clientSecret,
    callbackURL: "http://localhost:3000/auth/google/callback",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOne({ googleId: profile.id }, function (err, user) {
      if(!user){
        User.create({
          googleId: profile.id,
          names : profile.displayName,
          email: profile.email,
          username: profile.email
        },function(err, user){
          var holder = email.app;
          var mailer = email.mailer;
          holder.mailer.send('email/welcome', {
            to: email, // REQUIRED. This can be a comma delimited string just like a normal email to field.
            subject: 'Welcome To Sokoestate', // REQUIRED.
            otherProperty: 'Other Property' // All additional properties are also passed to the template as local variables.
          }, function (err) {
            if (err) {
              // handle error
              console.log(err);
              res.send('There was an error sending the email');
              return;
            }
          });
          return done(err, user);
        })
      }else{
        return done(null, user);
      }
    }).catch(function(err){
      console.log(err);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: config.facebook.clientId,
    clientSecret: config.facebook.clientSecret,
    callbackURL: "http://localhost:3000/auth/facebook/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOne({ facebookid: profile.id }, function (err, user) {
      if(!user){
        User.create({
          facebookid: profile.id,
          names : profile.displayName,
          email: profile.id,
          username: profile.id
        },function(err, user){
          return done(err, user);
        })
      }else{
        return done(null, user);
      }
    }).catch(function(err){
      console.log(err);
    });
  }
));

app.use(function(req, res, next){
  //INITIALIZE EMPTY USER OBJECT FOR USERS NOT LOGGED
  var emptyUser = {};
  var loggedin = false;
  var cartExists = false;
  if(req.user){
    loggedin = true;
  }
  if(req.session.cart){
    cartExists = true;
  }
  res.setHeader('Access-Control-Allow-Origin', req.get('host'));
  res.locals.success_msg = req.flash('success_msg') || null;
  res.locals.error_msg = req.flash('error_msg') || null;
  res.locals.error = req.flash('error') || null;
  res.locals.user = req.user || emptyUser;
  res.locals.loggedin = loggedin;
  res.locals.cart = req.session.cart || null;
  res.locals.cartexists = cartExists;
  res.locals.forgotpassword = req.get('host');
  if(req.user != null){
    next();
  }else{
     next();
  }
});

app.get('/logout', function(req, res){
  req.logout();
  req.session = null;
  res.redirect("/");
  res.end();
});

app.post('/login', passport.authenticate('local', {failureRedirect: '/login',
                                   failureFlash: true })
  , function(req, res){
    ssn = req.session;
    if(ssn.returnUrl){
      res.redirect(ssn.returnUrl);
    }
    res.redirect('/');
});

app.post('/register',
  [
  check('names', 'Full name can not be empty')
    .exists(),
  check('phone', 'Phone should have 10 characters e.g. (0700123123 or +254700123123)')
    .isLength({ min: 3, max: 13 }),
  check('email')
    .isEmail().withMessage('must be an email')
    .trim()
    .normalizeEmail(),

  // General error messages can be given as a 2nd argument in the check APIs
  check('password', 'passwords must be at least 5 chars long and contain one number')
    .isLength({ min: 4 })
    .matches(/\d/)
    .custom((value,{req, loc, path}) => {
        if (value !== req.body.cpassword) {
            // trow error if passwords do not match
            throw new Error("Passwords don't match");
        } else {
            return value;
        }
    }),
  ],
   (req, res, next) => {
    // Get the validation result whenever you want; see the Validation Result API for all options!
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      var form = {
            nameholder: req.body.names,
            phoneholder: req.body.username,
            emailholder: req.body.email
        };
      console.log(errors.mapped());
      res.render('user/register', { validationerrors: errors.mapped(), form: form });
    }else{
      var names = req.body.names;
      var phone = req.body.phone;
      var username = req.body.email;
      var email = req.body.email;
      var password = req.body.password;
      var role = 0;
      var salt = bcrypt.genSaltSync(10);
      var hash = bcrypt.hashSync(password, salt);

      User.findOne({username: req.body.email}, function(err, resad){
          if(err){
            console.log(err);
            //throw new Error('Something went wrong, kindly try again');
            req.flash("error_msg","User already registered with that email address");
            res.redirect('/register');
          }
          if (!resad){
            User.create({
                id: slug(names),
                username: email,
                email: email,
                names: names,
                password: hash,
                phone: phone,
                role: role,
            }, function (err, user) {
              if (err) {
                console.log(err.errmsg);
                throw new Error(err);
                //res.json(err);
                //return handleError(err);
              }
              if(user){
                /*
                var holder = emailModel.app;
                var mailer = emailModel.mailer;
                holder.mailer.send('email/welcome', {
                  to: email, // REQUIRED. This can be a comma delimited string just like a normal email to field.
                  subject: 'Welcome To FindIt', // REQUIRED.
                  otherProperty: 'Other Property' // All additional properties are also passed to the template as local variables.
                }, function (err) {
                  if (err) {
                    // handle error
                    console.log(err);
                    res.send('There was an error sending the email');
                    return;
                  }
                });
                */
                req.flash('success_msg','Registration was Successful. Kindly Login');
                req.login(user, function(err){
                    if(err) return next(err);
                    res.redirect('/');
                });
              }
            // saved!
            });
          }else{
            req.flash('error_msg','User with this: ('+ req.body.email +') email already exists');
            res.redirect('/register');
          }
      });
    }
  }
);


app.get('/auth/google', passport.authenticate('google', { scope: [
       'https://www.googleapis.com/auth/plus.login',
       'https://www.googleapis.com/auth/plus.profile.emails.read']
}));

// GET /auth/google/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function function will be called,
//   which, in this example, will redirect the user to the home page.
app.get( '/auth/google/callback',
      passport.authenticate( 'google', {
        failureRedirect: '/login'
  }),
  function(req, res) {
    ssn = req.session;
    if(ssn.returnUrl){
      res.redirect(ssn.returnUrl);
    }
    res.redirect('/');
  });

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/callback',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    ssn = req.session;
    if(ssn.returnUrl){
      res.redirect(ssn.returnUrl);
    }
    res.redirect('/');
  });


app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/category', categoryRouter);
app.use('/admin', adminRouter);
app.use('/property', propertyRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
