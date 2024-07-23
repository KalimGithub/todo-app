const mongoose = require("mongoose")
const Schema = mongoose.Schema;

const todoSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
    },
    todo: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const todoModel = mongoose.model("Todo", todoSchema);
module.exports = todoModel;