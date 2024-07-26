const express = require("express");
require("dotenv").config();
const clc = require("cli-color");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);

// file-imports
const { userValidation, isValidEmail } = require("./utils/authUtils");
const userModel = require("./models/userModel");
const isAuth = require("./middlewares/authMiddleware");
const toDoModel = require("./models/toDoModel");
const todoDataValidation = require("./utils/todoUtils");
const todoModel = require("./models/toDoModel");
const rateLimiting = require("./middlewares/rateLiming");

// constants
const app = express();
const PORT = process.env.PORT;
const store = new mongodbSession({
  uri: process.env.MONGO_URI,
  collection: "sessions",
});
// Db connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log(clc.yellowBright.bold("Connected to MongoDB successfully!"));
  })
  .catch((err) => {
    console.log(clc.redBright.bold(err));
  });

// Middlewares
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true })); // body parser for urlencoded
app.use(express.json()); //body parser for json
app.use(express.static("public")); //making public folder as static and run for browser environment
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    store: store,
    resave: false,
    saveUninitialized: false,
  })
);
// API's
app.get("/", (req, res) => {
  console.log(clc.bgBlue("api is working"));
  return res.render("homePage");
});

app.get("/register", (req, res) => {
  return res.render("registerPage");
});

app.post("/register", async (req, res) => {
  // console.log(req.body);
  const { name, email, username, password } = req.body;

  // data validation
  try {
    await userValidation({ name, email, username, password });
  } catch (error) {
    return res.status(400).json(error);
  }

  try {
    // // email and username should be unique
    const userEmailExist = await userModel.findOne({ email: email });
    if (userEmailExist) {
      return res.status(400).json("Email already Exists");
    }
    const userUsernameExist = await userModel.findOne({ username: username });
    if (userUsernameExist) {
      return res.status(400).json("Username already exists");
    }
    // // encrypt the password
    const hashedPassword = await bcrypt.hash(
      password,
      parseInt(process.env.SALT)
    );
    // // store in db
    const userObj = new userModel({
      name,
      email,
      username,
      password: hashedPassword,
    });
    // console.log(userObj);
    const userDb = await userObj.save();
    return res.redirect("/login");
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error,
    });
  }
});

app.get("/login", (req, res) => {
  res.render("loginPage.ejs");
});

app.post("/login", async (req, res) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) {
    return res.status(400).json("Missing Login credentials");
  }
  if (typeof loginId !== "string") {
    return res.status(400).json("loginId is not a string");
  }
  if (typeof password !== "string") {
    return res.status(400).json("password is not a string");
  }

  // find user from db
  try {
    let userDb = {};
    if (isValidEmail({ key: loginId })) {
      userDb = await userModel.findOne({ email: loginId });
    } else {
      userDb = await userModel.findOne({ username: loginId });
    }
    if (!userDb)
      return res.status(400).json("user not found plz register first");

    // compare the password
    const isMatched = await bcrypt.compare(password, userDb.password);
    if (!isMatched) {
      return res.status(400).json("incorrect password");
    }
    // session based auth
    console.log(req.session);
    req.session.isAuth = true;
    req.session.user = {
      userId: userDb._id,
      username: userDb.username,
      email: userDb.email,
    };

    return res.redirect("/dashboard");
  } catch (error) {
    return res.status(500).json(error);
  }
});

app.get("/dashboard", isAuth, (req, res) => {
  res.render("dahsboardPage");
});

// logout api
app.post("/logout", isAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json("logout unsuccessful");
    return res.redirect("/login");
  });
});

// todo API's
// create api
app.post("/create-item", isAuth, rateLimiting, async (req, res) => {
  // req.body spread
  // console.log(req.session.user.username);
  const { todo } = req.body;
  const username = req.session.user.username;
  // data validation
  try {
    await todoDataValidation({ todo });
  } catch (error) {
    return res.status(400).json(error);
  }
  // create todo in db
  const todoDb = new toDoModel({
    username: username,
    todo: todo,
  });
  // store in db
  try {
    const todoData = await todoDb.save();
    return res.status(201).json({
      message: "todo created successfully",
      data: todoData,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Internal server error",
      error: error,
    });
  }
});
// read api
app.get("/read-item", isAuth, async (req, res) => {
  const username = req.session.user.username;
  const SKIP = Number(req.query.skip) || 0;
  const LIMIT = 5;
  console.log(SKIP);
  try {
    //  const todoData = await toDoModel.find({ username: username });

    // mondodb aggregate method
    // match and pagination(skip, limit)
    const todoData = await todoModel.aggregate([
      { $match: { username: username } },
      { $skip: SKIP },
      { $limit: LIMIT },
    ]);
    // console.log("208", todoData);

    if (todoData.length === 0) {
      if (SKIP > 0) {
        return res.send({
          status: 403,
          message: "No More todo found",
        });
      } else {
        return res.send({
          status: 403,
          message: "No todo found",
        });
      }
    }
    return res.send({
      status: 200,
      message: "Read success",
      data: todoData,
    });
  } catch (error) {
    return res.send({
      status: 400,
      message: "Internal server error",
      data: error,
    });
  }
});
// edit api
app.post("/edit-item", isAuth, async (req, res) => {
  // get new todo and todo id from req
  const newData = req.body.newData;
  const todoId = req.body.todoId;
  const username = req.session.user.username;
  // todo id validation
  if (!todoId) return res.status(400).json("Todo Id is missing");
  // todo data validation
  try {
    await todoDataValidation({ todo: newData });
  } catch (error) {
    return res.send({
      status: 400,
      message: error,
    });
  }
  // fiding todo from db by the todoId
  try {
    const todoDb = await toDoModel.findOne({ _id: todoId });
    console.log("todo database", todoDb);

    if (!todoDb) {
      res.send({
        status: 400,
        message: `Todo is not found with id ${todoId}`,
      });
    }
    // checking ownership
    console.log(username, todoDb.username);
    if (username !== todoDb.username) {
      return res.send({
        status: 403,
        message: "not allowed to edit the todo",
      });
    }
    // update to do in db
    const todoDbprev = await toDoModel.findOneAndUpdate(
      { _id: todoId },
      { todo: newData }
    );
    return res.send({
      status: 200,
      message: "todo updated successfully",
      data: todoDbprev,
    });
  } catch (error) {
    return res.send({
      status: 400,
      message: "internal server error",
      error: error,
    });
  }
});
// delete api
app.post("/delete-item", isAuth, async (req, res) => {
  // get todo id from req
  const todoId = req.body.todoId;
  if (!todoId)
    return res.send({
      status: 400,
      message: "todo id is missing",
    });

  // get username from req session
  const username = req.session.user.username;
  // find todo from db from given todo id
  const todoDb = await toDoModel.findOne({ _id: todoId });
  if (!todoDb)
    return res.status(400).json(`cannot find the todo from this id: ${todoId}`);
  // checking ownership
  // console.log(username, todoDb.username);
  if (username !== todoDb.username) {
    return res.send({
      status: 403,
      message: "not allowed to delete this todo",
    });
  }
  // finding and deleting the todo in db
  try {
    const todoDbPrev = await toDoModel.findOneAndDelete({ _id: todoId });
    return res.send({
      status: 200,
      message: "todo deleted successfully",
      data: todoDb,
    });
  } catch (error) {
    return res.send({
      status: 400,
      message: "internal server error",
      error: error,
    });
  }
});

// making server a listener
app.listen(PORT, () => {
  console.log(clc.yellowBright.bold.underline(`server is running at:`));
  console.log(`http://localhost:${PORT}`);
});
