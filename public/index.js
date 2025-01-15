import { ClientDb, initIndexedDb, ServerDb } from "./database.js";

const choreNameInput = document.querySelector("#choreName");
const choreDescInput = document.querySelector("#choreDesc");
const choresChildrenSelect = document.querySelector("#choresChildrenSelect");
const addChoreBtn = document.querySelector("#addChore");

const signupLink = document.querySelector("#signupLink");
const loginLink = document.querySelector("#loginLink");
const signupForm = document.querySelector("#signupForm");
const loginForm = document.querySelector("#loginForm");

const choresList = document.querySelector("main section ul");
const sortChoresBtn = document.querySelector("#sortChores");
const refreshBtn = document.querySelector("#refresh");
const choresListStatusPara = document.querySelector("#choreListStatus");

const main = document.querySelector("main");

let cyclicPair = [];
let dbDriver;

// init page

// check if account has been saved
function init() {
  // hide sign up login forms
  loginForm.style.display = "none";
  signupForm.style.display = "none";

  // user-data
  const token = localStorage.getItem("authToken");
  if (token) {
    loginLink.style.display = "none";
    signupLink.style.display = "none";


    // greetings user first name + last name

    // init db driver
    dbDriver = new ServerDb(token);
    readAndDisplayAllChores();
  } else {
  // database
    initIndexedDb().then((db) => {
      dbDriver = new ClientDb(db);
      readAndDisplayAllChores();
    });

  }


}

init();

loginLink.addEventListener("click", (event) => {
  event.preventDefault();

  // show up login form
  for (const child of main.children) {
    if (child !== loginForm) {
      child.style.display = "none";
    }
  }
  loginForm.style.display = "block";
});

signupLink.addEventListener("click", (event) => {
  event.preventDefault();

  // show up login form
  for (const child of main.children) {
    if (child !== signupForm) {
      child.style.display = "none";
    }
  }
  signupForm.style.display = "block";
});

sortChoresBtn.addEventListener("click", (event) => {
  event.preventDefault();
  choresListStatusPara.textContent = "";

  Promise.all([dbDriver.getChores(), dbDriver.getConnections()]).then(
    ([chores, conns]) => {
      if (Object.keys(chores).length === 0) {
        displaySortSuccess(chores);
        return;
      }
      const order = ordering(chores, conns); // return ordering of chore keys

      if (order.length !== Object.keys(chores).length) {
        // cycle detected
        displaySortError(chores);
      } else {
        displayData(chores, conns, order);
      }
    }
  );
});

function displaySortError(chores) {
  while (choresList.firstChild) {
    choresList.removeChild(choresList.firstChild);
  }
  const firstChoreName = chores[cyclicPair[0]].name;
  const secondChoreName = chores[cyclicPair[1]].name;
  choresListStatusPara.textContent = `Whoops! A loop is found between chore "${firstChoreName}" and "${secondChoreName}". Please double-check your chores and try again!`;
  choresListStatusPara.setAttribute("class", "error");
}

refreshBtn.addEventListener("click", (event) => {
  event.preventDefault();
  choresListStatusPara.textContent = "";
  readAndDisplayAllChores();
});

addChoreBtn.addEventListener("click", (event) => {
  choreNameInput.setCustomValidity("");

  if (!choreNameInput.validity.valid) {
    return;
  }
  const newName = choreNameInput.value.trim();

  event.preventDefault();

  const children = [];

  for (const option of choresChildrenSelect.children) {
    if (option.selected) {
      children.push(Number(option.value));
    }
  }

  const newChore = {
    name: newName,
    desc: choreDescInput.value,
  };

  dbDriver
    .addChore(newChore)
    .then((newChoreId) => {
      const addConnPromises = children.map((childKey) =>
        dbDriver.addConnection(newChoreId, childKey)
      );

      return Promise.all(addConnPromises);
    })
    .then(() => {
      // clear inputs
      choreNameInput.value = "";
      choreDescInput.value = "";
      choresChildrenSelect.value = "";

      // reload data
      readAndDisplayAllChores();
    });
});

function readAndDisplayAllChores() {
  const p = Promise.all([dbDriver.getChores(), dbDriver.getConnections()]);
  p.then(([chores, conns]) => {
    // loadData(chores, conns);
    displayData(chores, conns);
    updateSelectOptions(chores); // in "Add Chore" form
  });
}

function updateSelectOptions(chores) {
  while (choresChildrenSelect.firstChild) {
    choresChildrenSelect.removeChild(choresChildrenSelect.firstChild);
  }

  for (const [choreId, chore] of Object.entries(chores)) {
    const option = document.createElement("option");

    option.textContent = chore.name;
    option.value = choreId;
    option.name = choresChildrenSelect.name;
    choresChildrenSelect.appendChild(option);
  }

  choresChildrenSelect.size = Math.max(
    1,
    Math.min(3, Object.keys(chores).length)
  );
}

function displaySortSuccess(chores) {
  if (Object.keys(chores).length === 0) {
    choresListStatusPara.textContent =
      "Oh! It looks like your chore list is empty!";
  } else {
    choresListStatusPara.textContent = "Yay! All your chores are sorted!";
  }
  choresListStatusPara.setAttribute("class", "success");
}

function displayNonSortSuccess(chores) {
  choresListStatusPara.textContent = "";
  if (Object.keys(chores).length === 0) {
    choresListStatusPara.textContent =
      "Your chore list is empty! Ready to add some new tasks?";
  }
  choresListStatusPara.setAttribute("class", "success");
}

function displayData(chores, conns, order = []) {
  // clear up chore list view
  while (choresList.firstChild) {
    choresList.removeChild(choresList.firstChild);
  }
  const choreKeys = order.length === 0 ? Object.keys(chores) : order;

  // sort mode
  if (order.length > 0) {
    displaySortSuccess(chores);
    choresList.classList.add("sortView");
  } else {
    displayNonSortSuccess(chores);
    choresList.classList.remove("sortView");
  }

  for (const choreId of choreKeys) {
    const chore = chores[choreId];
    const li = document.createElement("li");
    li.setAttribute("data-item-id", choreId);

    // content wrapper
    const div = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.textContent = chore.name;

    const para = document.createElement("p");
    para.textContent = chore.desc;

    // display children
    const childrenPara = document.createElement("p");
    childrenPara.textContent = "Must complete before:";

    const childrenListWrapper = document.createElement("ul");
    const childrenKeys = Object.hasOwn(conns, choreId) ? conns[choreId] : [];
    for (const childKey of childrenKeys) {
      const childLi = document.createElement("li");
      childLi.setAttribute("data-item-id", childKey);
      const child = chores[childKey];
      childLi.textContent = child.name;

      childrenListWrapper.appendChild(childLi);
    }

    const nav = document.createElement("nav");
    const editBtn = document.createElement("button");
    editBtn.type = "submit";
    editBtn.textContent = "Edit";
    editBtn.addEventListener("click", updateItem);

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "submit";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", deleteItem);

    nav.appendChild(editBtn);
    nav.appendChild(deleteBtn);

    div.appendChild(h3);
    div.appendChild(para);
    if (childrenKeys.length > 0) {
      div.appendChild(childrenPara);
      div.appendChild(childrenListWrapper);
    }

    li.appendChild(div);
    li.appendChild(nav);

    choresList.appendChild(li);
  }
}

function deleteItem(event) {
  // delete from the db
  const choreKey = Number(
    event.target.parentNode.parentNode.getAttribute("data-item-id")
  );

  // read the chore children
  dbDriver.getChildren(choreKey);

  // read the chore parents
  dbDriver.getParents(choreKey);

  Promise.all([
    dbDriver.getChildren(choreKey),
    dbDriver.getParents(choreKey),
  ]).then(([targetChoreChildren, targetChoreParents]) => {
    // pairs of connections to delete
    const pairs = [];
    // delete chore children
    for (const childKey of targetChoreChildren) {
      pairs.push([choreKey, childKey]);
    }

    // delete chore parents
    for (const parentKey of targetChoreParents) {
      pairs.push([parentKey, choreKey]);
    }
    const p1 = dbDriver.deleteChore(choreKey);
    const p2 = pairs.map((pair) => dbDriver.deleteConnection(pair[0], pair[1]));

    Promise.all([p1, ...p2]).then(() => readAndDisplayAllChores());
  });
}

function updateItem(event) {
  event.preventDefault();

  const target = event.target;

  // parent node = list item
  const choreListItem = target.parentNode.parentNode;
  const targetChoreId = Number(choreListItem.getAttribute("data-item-id"));

  Promise.all([dbDriver.getChores(), dbDriver.getChildren(targetChoreId)]).then(
    ([chores, targetChoreChildren]) => {
      // display update form

      const targetChore = chores[targetChoreId];
      // change the item to form
      const formElem = document.createElement("form");

      const div = document.createElement("div");

      // name
      const namePara = document.createElement("p");
      const nameLabel = document.createElement("label");
      nameLabel.textContent = "Name";
      const nameInput = document.createElement("input");
      nameInput.id = "newName";
      nameInput.value = targetChore.name;
      nameInput.required = true;
      namePara.appendChild(nameLabel);
      namePara.appendChild(nameInput);

      // description
      const descPara = document.createElement("p");
      const descLabel = document.createElement("label");
      descLabel.textContent = "Notes";
      const descInput = document.createElement("textarea");
      descInput.id = "newDesc";
      descInput.rows = "3";
      descInput.value = targetChore.desc;
      descPara.appendChild(descLabel);
      descPara.appendChild(descInput);

      // children
      const childrenPara = document.createElement("p");
      const childrenLabel = document.createElement("label");
      childrenLabel.textContent = "Must complete before";

      const selectWrapper = document.createElement("select");
      selectWrapper.multiple = true;
      selectWrapper.id = "newChildren";

      for (const [choreKey, chore] of Object.entries(chores)) {
        const choreId = Number(choreKey);
        if (choreId !== targetChoreId) {
          const option = document.createElement("option");

          option.textContent = chore.name;
          option.value = choreId;
          option.name = chore.name;
          option.selected = targetChoreChildren.includes(choreId);
          selectWrapper.appendChild(option);
        }
      }
      selectWrapper.size = Math.min(3, Object.keys(chores).length - 1);

      childrenPara.appendChild(childrenLabel);
      childrenPara.appendChild(selectWrapper);

      div.appendChild(namePara);
      div.appendChild(descPara);
      div.appendChild(childrenPara);

      // save and cancel button
      const buttonPara = document.createElement("p");

      const saveUpdateBtn = document.createElement("button");
      saveUpdateBtn.textContent = "Save changes";
      saveUpdateBtn.addEventListener("click", (event) => {
        saveUpdate(event, targetChoreChildren);
      });

      const cancelUpdateBtn = document.createElement("button");
      cancelUpdateBtn.textContent = "Cancel";

      cancelUpdateBtn.addEventListener("click", (e) => {
        e.preventDefault();
        while (choreListItem.firstChild) {
          choreListItem.removeChild(choreListItem.firstChild);
        }
        for (const child of deletedChildren) {
          choreListItem.appendChild(child);
        }
      });

      buttonPara.appendChild(saveUpdateBtn);
      buttonPara.appendChild(cancelUpdateBtn);

      formElem.appendChild(div);
      formElem.appendChild(buttonPara);

      const deletedChildren = []; // save deleted children for cancel update
      while (choreListItem.firstChild) {
        const deletedChild = choreListItem.removeChild(
          choreListItem.firstChild
        );
        deletedChildren.push(deletedChild);
      }

      choreListItem.appendChild(formElem);
    }
  );
}

function saveUpdate(event, targetChoreChildren) {
  const target = event.target; // button
  const form = target.parentNode.parentNode;

  const updateNameInput = document.querySelector("#newName");
  const updateDescInput = document.querySelector("#newDesc");
  const updateChildrenSelect = document.querySelector("#newChildren");
  const targetChoreId = Number(form.parentNode.getAttribute("data-item-id"));

  // updateNameInput.setCustomValidity("");

  // if (!updateNameInput.validity.valid) {
  //   return;
  // }
  const newName = updateNameInput.value.trim();
  event.preventDefault();

  dbDriver.getChore(targetChoreId)
    .then((item) => {
      const promises = [];
      item.name = newName;
      item.desc = updateDescInput.value;

      promises.push(dbDriver.updateChore(targetChoreId, item));

      for (const option of updateChildrenSelect.children) {
        const childChoreId = Number(option.value);
        if (option.selected) {
          // add if not existed
          if (!targetChoreChildren.includes(childChoreId)) {
            promises.push(dbDriver.addConnection(targetChoreId, childChoreId));
          }
        } else {
          // remove this edge if exist
          if (targetChoreChildren.includes(childChoreId)) {
            promises.push(
              dbDriver.deleteConnection(targetChoreId, childChoreId)
            );
          }
        }
      }
      return Promise.all(promises);
    })
    .then((result) => {
      readAndDisplayAllChores();
    });
}

function dfs(node, connections, status, ordering) {
  // return true iff done explore tree rooted at i without cycles dected
  // return false otherwise
  status[node] = -1;

  // explore its children
  for (const child of connections[node]) {
    if (status[child] === -1) {
      cyclicPair = [node, child];
      return false;
    }
    if (status[child] === 0) {
      const isAcyclic = dfs(child, connections, status, ordering);
      if (!isAcyclic) {
        return false;
      }
    }
  }

  status[node] = 1;
  ordering.unshift(node);
  return true;
}

function ordering(chores, connections) {
  // dfs on the graph, get order
  const status = {}; // visit status of each node. 0: not visited, -1: being explored its descendants, 1: its tree visited

  for (const choreId in chores) {
    status[choreId] = 0;
    if (!Object.hasOwn(connections, choreId)) {
      connections[choreId] = [];
    }
  }

  // run dfs
  const ordering = []; // append from the start

  for (const choreId in chores) {
    if (status[choreId] === 0) {
      const isAcyclic = dfs(choreId, connections, status, ordering);
      if (!isAcyclic) {
        // cycle detected
        return [];
      }
    }
  }
  return ordering;
}
