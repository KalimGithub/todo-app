let skip = 0;
window.onload = generateTodos;

function generateTodos() {
  axios
    .get(`/read-item?skip=${skip}`)
    .then((response) => {
      //   console.log(response);
      if (response.data.status !== 200) {
        alert(response.data.message);
        return;
      }
      console.log(skip);
      const todos = response.data.data;
      skip += todos.length;
      console.log(skip);
      document.getElementById("item-list").insertAdjacentHTML(
        "beforeend",
        todos
          .map((item) => {
            return `
            <li class='todo'>
                <span class='todo-text'>${item.todo}</span>
                <div class='btn-div'>
                <button class='btn edit-btn' data-id=${item._id}>Edit</button>
                <button class='btn delete-btn' data-id=${item._id}>Delete</button>
            </div>
            </li>
            `;
          })
          .join("")
      );
      console.log(todos);
    })
    .catch((error) => {
      console.log(error);
    });
}

document.addEventListener("click", (event) => {
  if (event.target.classList.contains("edit-btn")) {
    const newData = prompt("Enter new todo Text");
    const todoId = event.target.getAttribute("data-id");
    // console.log(newData, todoId);
    axios
      .post("/edit-item", { newData, todoId })
      .then((response) => {
        console.log(response);
        if (response.data.status !== 200) {
          alert(response.data.message);
          return;
        }
        // window.location.reload()
        event.target.parentElement.parentElement.querySelector(
          ".todo-text"
        ).innerHTML = newData;
      })
      .catch((err) => {
        console.log(err);
      });
  } else if (event.target.classList.contains("delete-btn")) {
    const todoId = event.target.getAttribute("data-id");
    axios
      .post("/delete-item", { todoId })
      .then((response) => {
        //   console.log(response);
        if (response.data.status !== 200) {
          alert(response.data.message);
          return;
        }
        //   window.location.reload();
        event.target.parentElement.parentElement.remove();
      })
      .catch((err) => {
        console.log(err);
      });
  } else if (event.target.classList.contains("add-btn")) {
    const todo = document.getElementById("todo-input").value;
    // console.log(todo);

    axios
      .post("/create-item", { todo })
      .then((res) => {
        const todoText = res.data.data.todo;
        const todoId = res.data.data._id;
        // console.log(todoText, todoId);
        document.getElementById("todo-input").value = "";
        console.log(res);
        document.getElementById("item-list").insertAdjacentHTML(
          "beforeend",
          `
            <li class='todo'>
                <span class='todo-text'>${todoText}</span>
                <div class='btn-div'>
                    <button class='btn edit-btn' data-id=${todoId}>Edit</button>
                    <button class='btn delete-btn' data-id=${todoId}>Delete</button>
                </div>
            </li>
            `
        );
      })
      .catch((err) => {
        console.log(err);
        if (err.response.status !== 500) {
          alert(err.response.data);
        }
      });
  } else if (event.target.classList.contains("logout-btn")) {
    axios
      .post("/logout", {})
      .then((res) => {
        console.log(res);
        if (res.status == 200) {
          alert("Logout successful!!!");
          axios
            .get("/login", {})
            .then((res) => {
              window.location = "/login";
              //   console.log(res);
            })
            .catch((err) => {
              console.log(err);
            });
        }
      })
      .catch((err) => {
        console.log(err);
      });
  } else if (event.target.classList.contains("show-more")) {
    generateTodos();
  }
});
