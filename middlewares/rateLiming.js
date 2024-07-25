const accessModel = require("../models/accessModel");

const rateLimiting = async (req, res, next) => {
  //   console.log(req.session.id);
  const sid = req.session.id;
  try {
    const accessDb = await accessModel.findOne({ sessionId: sid });
    // console.log(accessDb);
    // if accessdb id null this is case of first req and store in db
    if (!accessDb) {
      const accessObj = new accessModel({ sessionId: sid, time: Date.now() });
      accessObj.save();
      next();
    }
    console.log((Date.now() - accessDb.time) / 1000);
    const diff = ((Date.now() - accessDb.time) / 1000);

    //if req time is less than ur logic
    if (diff < 10) {
      //1 req per second
      return res.status(400).json("Too many request Plz wait some time");
    }

    // req time is fine
    await accessModel.findOneAndUpdate(
      { sessionId: sid },
      { time: Date.now() }
    );
    next();
  } catch (error) {
    return res.status(500).json(error);
  }

  //   next();
};
module.exports = rateLimiting;
