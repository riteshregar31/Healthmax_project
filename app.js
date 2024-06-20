if (process.env.NODE_ENV !== "production") {
  require('dotenv').config();
}

const express=require('express')
const app=express()
const { cloudinary } = require("./cloudinary");
const mongoose=require('mongoose');
const Healthmax=require('./models/healthmax');
const methodOverride = require('method-override');
const ejsMate=require('ejs-mate');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressError');
const flash = require('connect-flash');
const passport = require('passport');
const LocalStrategy = require('passport-local');
const User = require('./models/user');
const { isLoggedIn,isAuthor } = require('./islogmiddle');
const multer = require('multer');
const { storage } = require('./cloudinary');
const upload = multer({ storage });
const mongoSanitize = require('express-mongo-sanitize');
const secret = process.env.SECRET || 'thisdfdssdfdsfdstet!';
const Info = require('./models/infor');
const session = require('express-session');
const MongoDBStore = require("connect-mongo")(session);


const dburl=process.env.DB_URL



// const dburl='mongodb://127.0.0.1:27017/hrecord'
main().catch(err => console.log(err));


async function main() {
  await mongoose.connect(dburl);
  console.log("Database connected")

}
const db=mongoose.connection;
const path=require('path');

const healthmax = require('./models/healthmax');
const { string, boolean } = require('joi');
app.engine('ejs',ejsMate)
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));
app.set('view engine','ejs')
app.set('views',path.join(__dirname,'views'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(mongoSanitize({
  replaceWith: '_'
}))



const store = new MongoDBStore({
  url: dburl,
  secret,
  touchAfter: 24 * 60 * 60
});

store.on("error", function (e) {
  console.log("SESSION STORE ERROR", e)
})

const sessionConfig = {
  store,
  name: 'session',
  secret,
  resave: false,
  saveUninitialized: true,
  cookie: {
      httpOnly: true,
      // secure: true,
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      maxAge: 1000 * 60 * 60 * 24 * 7
  }}

app.use(session(sessionConfig))
app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());
app.use((req, res, next) => {
  console.log(req.session)
  res.locals.currentUser = req.user;
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
})




app.get('/',(req,res,next)=>{
res.render('home')
})

app.get('/newuser',(req,res)=>{
  res.render('users/register');
})

app.get('/login', (req, res) => {
  res.render('users/login');
})
app.post('/login', passport.authenticate('local', { failureFlash: true, failureRedirect: '/login' }), async (req, res) => {
   
 
   const hr= await Healthmax.findOne({"author":req.user._id})
   if(hr!=null){
    req.flash('success', 'Welcome back!!! ')
    res.redirect(`/userinfo/${hr.id}`);

   }
   else{
  req.flash('success', 'enter your information ')
    // console.log('i did not have author')
    const redirectUrl='/newuserinfo';
      res.redirect(redirectUrl);
   }

})


app.get('/newuserinfo',(req,res)=>{  
  res.render('health/new');
})
app.post('/register', catchAsync(async (req, res, next) => {
  try {
      const { email, username, password } = req.body;
      const user = new User({ email, username });
      const registeredUser = await User.register(user, password);
      req.login(registeredUser, err => {
          if (err) return next(err);
          req.flash('success', 'Account created !!!');
          res.redirect('/login');
      })
  } catch (e) {
      req.flash('error', e.message);
      res.redirect('register');
  }
}));


app.get('/logout', (req, res) => {
  req.logout(function(err) {
    if (err) { return res.status(500).json({ message: "Error during logout." }); }
    req.flash('success', "Goodbye!");
    res.redirect('/');
  });
 
})



app.post('/userinfo',  isLoggedIn, catchAsync(async (req, res, next) => {
const hr = new Healthmax(req.body.hr);
  hr.author = req.user._id;
  await hr.save();
  req.flash('success', 'Welcome! Your account is created');
  res.redirect(`/userinfo/${hr._id}`)
}))

app.get('/getprofile',(async(req,res)=>{
  const hr= await Healthmax.findOne({"author":req.user._id})

  res.redirect(`/userinfo/${hr._id}`)

}))

app.get('/userinfo/:id',isLoggedIn, isAuthor, catchAsync(async(req,res)=>{
   const {id}=req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'this user does not exists');
    return res.redirect('/');
   
  }

const hrr=await Healthmax.findById(id);
if (!hrr) {
  req.flash('error', 'This user does not exists');
  return res.redirect('/');
}
  
  const hr=await Healthmax.findById(req.params.id).populate({ path: 'info'}).exec();
  
  res.render('./health/show',{hr})

}))


app.post('/userinfo/:id/inform',isLoggedIn,isAuthor, catchAsync(async(req,res)=>{

  const {id}=req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'This user does not exists');
    return res.redirect('/');
   
  }

const hrr=await Healthmax.findById(id);
if (!hrr) {
  req.flash('error', 'This user does not exists');
  return res.redirect('/');
}
 const hr = await Healthmax.findById(req.params.id);
  const infor = new Info(req.body.infor);

  hr.info.push(infor);
  await infor.save();

   await hr.save();

  req.flash('success', 'data entered successfully');
  res.redirect(`/userinfo/${hr._id}`);
}))

app.get('/userinfo/:id/editp', isLoggedIn,isAuthor, catchAsync(async (req, res,next) => {

  const {id}=req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'this user does not exists');
    return res.redirect('/');
   
  }

const hrr=await Healthmax.findById(id);
if (!hrr) {
  req.flash('error', 'this user does not exists');
  return res.redirect('/');
}
  const hr = await Healthmax.findById(req.params.id)
 
  res.render('./health/editp', { hr });

}))



app.get('/userinfo/:id/editif', isLoggedIn,isAuthor, catchAsync(async (req, res,next) => {
  const {id}=req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'this user does not exists');
    return res.redirect('/');
   
  }

const hrr=await Healthmax.findById(id);
if (!hrr) {
  req.flash('error', 'this user does not exists');
  return res.redirect('/');
}
  const hr = await Healthmax.findById(req.params.id)
 
  res.render('./health/editif', { hr });

}))



app.get('/userinfo/:id/editis', isLoggedIn,isAuthor, catchAsync(async (req, res,next) => {
  const {id}=req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'this user does not exists');
    return res.redirect('/');
   
  }

const hrr=await Healthmax.findById(id);
if (!hrr) {
  req.flash('error', 'this user does not exists');
  return res.redirect('/');
}
  const hr = await Healthmax.findById(req.params.id)
 
  res.render('./health/editis', { hr });

}))
app.get('/userinfo/:id/editit', isLoggedIn,isAuthor, catchAsync(async (req, res,next) => {
  const {id}=req.params;
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'this user does not exists');
    return res.redirect('/');
   
  }

const hrr=await Healthmax.findById(id);
if (!hrr) {
  req.flash('error', 'this user does not exists');
  return res.redirect('/');
}
  const hr = await Healthmax.findById(req.params.id)
 
  res.render('./health/editit', { hr });

}))



app.put('/userinfo/:id', catchAsync( async(req, res) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'this user does not exists');
    return res.redirect('/');
   
  }

const hrr=await Healthmax.findById(id);
if (!hrr) {
  req.flash('error', 'this user does not exists');
  return res.redirect('/');
}
  const hr = await Healthmax.findByIdAndUpdate(id, { ...req.body.hr });
  res.redirect(`/userinfo/${hr._id}`);
  
}));



  app.put('/userinfo/:id/i1',isLoggedIn,isAuthor,  upload.array('image'),  ( async(req, res,) => {
    const {id}=req.params;
  
    if (!mongoose.Types.ObjectId.isValid(id)) {
      req.flash('error', 'this user does not exists');
      return res.redirect('/');
     
    }
  
  const hrr1=await Healthmax.findById(id);
  if (!hrr1) {
    req.flash('error', 'this user does not exists');
    return res.redirect('/');
  }
  const hrr=await Healthmax.findById(id);
  
console.log(hrr.image1.filename);
  
   hrr.image1 = req.files.map(f => ({ url: f.path, filename: f.filename }));

  await hrr.save();
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
        await cloudinary.uploader.destroy(filename);
    }
    await hrr.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
}
  const hr = await Healthmax.findByIdAndUpdate(id, { ...req.body.hr });
  req.flash('success', 'data edited successfully');

  res.redirect(`/userinfo/${hr._id}`);
  
}));


app.put('/userinfo/:id/i2',isLoggedIn,isAuthor,  upload.array('image'),  ( async(req, res,) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'this user does not exists');
    return res.redirect('/');
   
  }

const hrr1=await Healthmax.findById(id);
if (!hrr1) {
  req.flash('error', 'this user does not exists');
  return res.redirect('/');
}

  const hrr=await Healthmax.findById(id);
  
   hrr.image2 = req.files.map(f => ({ url: f.path, filename: f.filename }));
  
 await hrr.save();
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
        await cloudinary.uploader.destroy(filename);
    }
    await hrr.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
}
  const hr = await Healthmax.findByIdAndUpdate(id, { ...req.body.hr });
  req.flash('success', 'data edited successfully');

  res.redirect(`/userinfo/${hr._id}`);

}));




app.put('/userinfo/:id/i3', isLoggedIn,isAuthor, upload.array('image'),  ( async(req, res,) => {
  const { id } = req.params;
 
  
  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'this user does not exists');
    return res.redirect('/');
   
  }

const hrr1=await Healthmax.findById(id);
if (!hrr1) {
  req.flash('error', 'this user does not exists');
  return res.redirect('/');
}
  const hrr=await Healthmax.findById(id);
  
console.log(hrr.image3)
  
   hrr.image3 = req.files.map(f => ({ url: f.path, filename: f.filename }));
 
 await hrr.save();
  if (req.body.deleteImages) {
    for (let filename of req.body.deleteImages) {
        await cloudinary.uploader.destroy(filename);
    }
    await hrr.updateOne({ $pull: { images: { filename: { $in: req.body.deleteImages } } } })
}
  
  const hr = await Healthmax.findByIdAndUpdate(id, { ...req.body.hr });
  req.flash('success', 'data edited successfully');
  
  res.redirect(`/userinfo/${hr._id}`);

}));


app.delete('/userinfo/:id/info/:infoid', isLoggedIn,isAuthor, catchAsync(async (req, res) => {
  const { id, infoid } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    req.flash('error', 'this user does not exists');
    return res.redirect('/');
   
  }

const hrr=await Healthmax.findById(id);
if (!hrr) {
  req.flash('error', 'this user does not exists');
  return res.redirect('/');
}
  await Healthmax.findByIdAndUpdate(id, { $pull: { info: infoid } });
  await Info.findByIdAndDelete(infoid);
  req.flash('success', 'data deleted successfully');
  res.redirect(`/userinfo/${id}`);
}))




app.all('*', (req, res, next) => {
  next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
  const { statusCode = 500 } = err;
  if (!err.message) err.message = 'Something Went Wrong!'
  res.status(statusCode).render('error', { err })

})


app.listen(8000,()=>{
    console.log('port 8k open')
})




