function isValidEmail(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

const userValidation = ({ name, email, password, username }) => {
  return new Promise((resolve, reject) => {
    console.log(name, email, password, username);
    if (!name || !email || !username || !password) {
      reject("Missing credentials");
    }
    if (typeof name != "string") reject("name is not a text");
    if (typeof email != "string") reject("email is not a text");
    if (typeof username != "string") reject("username is not a text");
    if (typeof password != "string") reject("password is not a text");

    if (!isValidEmail(email)) reject("Email is not formatted");

    if (username.length < 3 || username.length > 50) {
    }
    resolve();
  });
};

module.exports = { userValidation, isValidEmail };
