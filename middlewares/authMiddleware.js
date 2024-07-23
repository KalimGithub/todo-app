const isAuth = (req, res, next) => {
  if (req.session.isAuth) {
    next();
  }
  else{
    return res.status(401).json("session expired plz login again")
  }
};

module.exports = isAuth;
