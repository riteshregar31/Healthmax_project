
const User = require('./models/user');
const Healthmax=require('./models/healthmax');
const Info = require('./models/infor');
const ExpressError = require('./utils/ExpressError');
const mongoose=require('mongoose');


module.exports.isLoggedIn = (req, res,next) => {
    if (!req.isAuthenticated()) {
        req.session.returnTo = req.originalUrl
        req.flash('error', 'for this you need to login');
        return res.redirect('/login');
    }
   next();
}

module.exports.isAuthor = async (req, res, next) => {
    const { id } = req.params;
      if (!mongoose.Types.ObjectId.isValid(id)) {
        req.flash('error', 'this user does not exists');
        return res.redirect('/');
        // return res.status(404).json({ msg: `No task with id :${id}` });
      }

    const hrr=await Healthmax.findById(id);
    if (!hrr) {
      req.flash('error', 'this user does not exists');
      return res.redirect('/');
    }
  
    // console.log(id)
    const hr = await Healthmax.findById(id);
//    let idd=(JSON.stringify(hr.author))
    // const user=await User.findById(hr.author);
    // console.log(user)
    // console.log(req.user.id)
    if (!hr.author.equals(req.user.id)) {
        req.flash('error', 'You do not have permission to do that!');
        return res.redirect(`/`);
    }
   
   
    next();
}