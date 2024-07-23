const todoDataValidation = ({ todo }) => {
  return new Promise((resolve, reject) => {
    if (!todo) reject("todo text is missing");
    if (todo.length < 3 || todo.length > 100){
      reject("todo text must be between 3 - 100 characters only");
    }
    if (typeof todo !== "string") reject("todo is not a text");
    resolve();
  });
};
module.exports = todoDataValidation;
