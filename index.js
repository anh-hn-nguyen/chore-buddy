const choreNameInput = document.querySelector("#choreName");
const choreDescInput = document.querySelector("#choreDesc");
const choresChildrenSelect = document.querySelector("#choresChildrenSelect");
const addChoreBtn = document.querySelector("#addChore");

const choresWrapper = document.querySelector("main section ul");
const sortChoresBtn = document.querySelector("#sortChores");
const reloadBtn = document.querySelector("#reload");
const sortErrorPara = document.querySelector("#sortError");

let db;

// items can be deleted, index can change
let allChores = [];
let choreIndexMap = {};

// open database chores
const openRequest = window.indexedDB.open("chores_db", 1);

// in case the db has not been set up or different version, run this handler
openRequest.addEventListener("upgradeneeded", (event) => {
    // set up the object store for chores
    db = event.target.result;

    // create object store
    const objectStore = db.createObjectStore("chores_os", {
        keyPath: "id",
        autoIncrement: true, // the value is genereated and stored in prop keyPath => used to identify the object
    })

    // define schema of the object store
    objectStore.createIndex("name", "name", { unique: true });
    objectStore.createIndex("desc", "desc", { unique: false });
    objectStore.createIndex("children", "children", { unique: false })

    console.log("Database setup complete");
})

openRequest.addEventListener("success", (event) => {
    console.log("Success openning database");

    // store the openned db to variable
    db = openRequest.result;

    readAndDisplayAllChores();
})

openRequest.addEventListener("error", (event) => {
    console.error("Failed to open database");
    console.log(event);
})


sortChoresBtn.addEventListener("click", (event) => {
    event.preventDefault();

    const sortedChores = sortItems();
    if (sortedChores.length != allChores.length) {
        // cycle detected
        displaySortError();
        return;
    }

    displayData(sortedChores);
})

function displaySortError() {
    while (choresWrapper.firstChild) {
        choresWrapper.removeChild(choresWrapper.firstChild);
    }

    sortErrorPara.textContent = "Please check your chores again. Cycle detected.";

}

reloadBtn.addEventListener("click", (event) => {
    event.preventDefault();
    sortErrorPara.textContent = "";
    readAndDisplayAllChores();
})

addChoreBtn.addEventListener("click", (event) => {
    event.preventDefault();

    const children = [];
    for (const option of choresChildrenSelect.children) {
        if (option.selected) {
            children.push(Number(option.value));
        }
    }

    const newChore = {
        name: choreNameInput.value,
        desc: choreDescInput.value,
        children: children
    };

    console.log(newChore);

    // add to the index db
    // start a new transaction with the db to add
    const transaction = db.transaction(["chores_os"], "readwrite");

    const objectStore = transaction.objectStore("chores_os"); // get the object store of this transaction

    const addRequest = objectStore.add(newChore); // carry out transaction

    addRequest.addEventListener("success", (event) => {
        // clear inputs
        choreNameInput.value = "";
        choreDescInput.value = "";
        choresChildrenSelect.value = "";
    });

    // report transaction results
    transaction.addEventListener("complete", (event) => {
        console.log("Transaction completed: database modification finished.");
        readAndDisplayAllChores();
    });

    transaction.addEventListener("error", (event) => {
        console.log("Transaction not opened due to error");
    })


});


function readAndDisplayAllChores() {
    allChores = [];

    // create a new transaction to read
    const transaction = db.transaction(["chores_os"], "readonly");

    const objectStore = transaction.objectStore("chores_os");

    // start a request to read
    const readRequest = objectStore.openCursor();

    readRequest.addEventListener("success", (event) => {
        const cursor = event.target.result;

        if (cursor) {
            allChores.push(cursor.value);
            cursor.continue();
        } else {
            console.log("read done");
            console.log(allChores);
            choreIndexMap = createIndexMap(allChores);
            displayData(allChores);
            displaySelectOptions();
        }

    })

}

function displaySelectOptions() {
    while (choresChildrenSelect.firstChild) {
        choresChildrenSelect.removeChild(choresChildrenSelect.firstChild);
    }

    for (const chore of allChores) {
        const option = document.createElement("option");

        option.textContent = chore.name;
        option.value = chore.id;
        option.name = choresChildrenSelect.name;
        choresChildrenSelect.appendChild(option);
    }

    choresChildrenSelect.size = Math.min(3, allChores.length);
}


function displayData(chores) {
    while (choresWrapper.firstChild) {
        choresWrapper.removeChild(choresWrapper.firstChild);
    }
    const indexMap = createIndexMap(chores); // map key of each object (chore) to its current index in the list, so later an parent object can be retrieved by the key
    
    for (const chore of chores) {
        const li = document.createElement("li");
        li.setAttribute("data-item-id", chore.id);

        const h3 = document.createElement("h3");
        h3.textContent = chore.name;
    
        const para = document.createElement("p");
        para.textContent = chore.desc;
    
        // display children
        const childrenPara = document.createElement("p");
        childrenPara.textContent = "Must be completed before:";
    
        const childrenListWrapper = document.createElement("ul");
        for (const childKey of chore.children) {
            const childLi = document.createElement("li");
            childLi.setAttribute("data-item-id", childKey);

            const child = chores[indexMap[childKey]];
            childLi.textContent = child.name;

            childrenListWrapper.appendChild(childLi);
        }
        
        const editBtn = document.createElement("button");
        editBtn.type = "submit";
        editBtn.textContent = "Edit";
        editBtn.addEventListener("click", updateItem);

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "submit";
        deleteBtn.textContent = "Delete";
        deleteBtn.addEventListener("click", deleteItem);
    
        li.appendChild(h3);
        li.appendChild(para);
        if (chore.children.length > 0) {
            li.appendChild(childrenPara);
            li.appendChild(childrenListWrapper);
        }
        li.appendChild(editBtn);
        li.appendChild(deleteBtn);
    
        choresWrapper.appendChild(li);
    }

}


function deleteItem(event) {
    // delete from the db
    const choreId = Number(event.target.parentNode.getAttribute("data-item-id"));

    // create transaction to update
    const transaction = db.transaction(["chores_os"], "readwrite");

    const objectStore = transaction.objectStore("chores_os");

    const readRequest = objectStore.openCursor();

    // delete from its parent
    readRequest.addEventListener("success", (e) => {
        const cursor = e.target.result;

        if (cursor) {
            const item = cursor.value;
            if (item.children.includes(choreId)) {
                const newChildren = [];
                for (const child of item.children) {
                    if (child !== choreId) {
                        newChildren.push(child);
                    }
                }
                item.children = newChildren;
                const updateRequest = cursor.update(item);
                updateRequest.addEventListener("success", (evt) => {
                    console.log(`Remove ${choreId} from parent ${item.id}`);
                })
            }
            cursor.continue();
        } else {
            // delete the target chore
            const deleteRequest = objectStore.delete(choreId);
            deleteRequest.addEventListener("success", (event) => {
                console.log(`Chore ${choreId} deleted`);
            });
        }
    })

    
    transaction.addEventListener("complete", () => {
        // event.target.parentNode.parentNode.removeChild(event.target.parentNode);
        console.log(`All delete and update is done`);
        readAndDisplayAllChores();
    });

    transaction.addEventListener("error", (error) => {
        console.error(error);
    })
}

function updateItem(event) {
    event.preventDefault();

    const target = event.target;

    // parent node = list item
    const choreListItem = target.parentNode;
    const choreKey = Number(choreListItem.getAttribute("data-item-id"));

    // get this item from index map
    const targetChore = allChores[choreIndexMap[choreKey]];


    // change the item to form?
    const formElem = document.createElement("form");

    // name
    const namePara = document.createElement("p");
    const nameLabel = document.createElement("label");
    nameLabel.textContent = "Name:";
    const nameInput = document.createElement("input");
    nameInput.id = "newName";
    nameInput.value = targetChore.name;
    namePara.appendChild(nameLabel);
    namePara.appendChild(nameInput);

    // description
    const descPara = document.createElement("p");
    const descLabel = document.createElement("label");
    descLabel.textContent = "Notes:";
    const descInput = document.createElement("input");
    descInput.id = "newDesc";
    descInput.value = targetChore.desc;
    descPara.appendChild(descLabel);
    descPara.appendChild(descInput);

    // children
    const childrenPara = document.createElement("p");
    const childrenLabel = document.createElement("label");
    childrenLabel.textContent = "Must be done before:";

    const selectWrapper = document.createElement("select");
    selectWrapper.multiple = true;
    selectWrapper.id = "newChildren";

    for (const chore of allChores) {
        if (chore.id != choreKey) {
            const option = document.createElement("option");

            option.textContent = chore.name;
            option.value = chore.id;
            option.name = choresChildrenSelect.name;
            option.selected = targetChore.children.includes(chore.id);
            selectWrapper.appendChild(option);
        }
    }
    selectWrapper.size = Math.min(3, allChores.length - 1);

    childrenPara.appendChild(childrenLabel);
    childrenPara.appendChild(selectWrapper);

    // save and cancel button


    const saveUpdateBtn = document.createElement("button");
    saveUpdateBtn.textContent = "Save changes";
    saveUpdateBtn.addEventListener("click", saveUpdate);

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

    formElem.appendChild(namePara);
    formElem.appendChild(descPara);
    formElem.appendChild(childrenPara);
    formElem.appendChild(saveUpdateBtn);
    formElem.appendChild(cancelUpdateBtn);


    const deletedChildren = []; // save deleted children for cancel update
    while (choreListItem.firstChild) {
        const child = choreListItem.removeChild(choreListItem.firstChild);
        deletedChildren.push(child);
    }

    choreListItem.appendChild(formElem);

}

function saveUpdate(event) {
    event.preventDefault();
    const target = event.target; // button
    const form = target.parentNode;

    const updateNameInput = document.querySelector("#newName");
    const updateDescInput = document.querySelector("#newDesc");
    const updateChildrenSelect = document.querySelector("#newChildren");

    const choreKey = Number(form.parentNode.getAttribute("data-item-id"));
  
    // save to db
    const transaction = db.transaction(["chores_os"], "readwrite");
    const objectStore = transaction.objectStore("chores_os");

    const readRequest = objectStore.get(choreKey);

    readRequest.addEventListener("success", (e) => {
        const item = e.target.result;
        item.name = updateNameInput.value;
        item.desc = updateDescInput.value;
        const newChildren = [];
        for (const option of updateChildrenSelect.children) {
            if (option.selected) {
                newChildren.push(Number(option.value));
            }
        }
        item.children = newChildren;

        const requestUpdate = objectStore.put(item);
        requestUpdate.addEventListener("success", () => {
            console.log("Update successful");
            // reload all items
            readAndDisplayAllChores();
        })

    })
}

function cancelUpdate (event) {
    event.preventDefault();
    readAndDisplayAllChores();
}


function createIndexMap(chores) {
    const indexMap = {}; // map item key to index in chores
    const n = chores.length;

    for (let i = 0; i < n; i++) {
        indexMap[chores[i].id] = i;
    }
    return indexMap;
}

function sortItems() {
    // map item keys to index
    // create adjacency list
    const indexMap = createIndexMap(allChores);
    const n = allChores.length;

    const adjacencyList = [];
    for (let i = 0; i < n; i++) {
        adjacencyList.push([]); // list to store i's children

        const childKeys = allChores[i].children;
    
        for (const childKey of childKeys) {
            adjacencyList[i].push(indexMap[childKey]);
        }
    }
    
    const order = ordering(n, adjacencyList);

    const sortedChores = [];
    for (const index of order) {
        sortedChores.push(allChores[index]);
    }

    return sortedChores;
}


function dfs(node, adjacencyList, status, ordering) {
    // return true iff done explore tree rooted at i without cycles dected
    // return false otherwise
    status[node] = -1;

    // explore its children
    for (const child of adjacencyList[node]) {
        if (status[child] === -1) {
            return false;
        }
        if (status[child] === 0) {
            isAcyclic = dfs(child, adjacencyList, status, ordering);
            if (!isAcyclic) {
                return false;
            }
        }
    }

    status[node] = 1;
    ordering.unshift(node);
    return true;
}

function ordering(numNodes, adjacencyList) {
    // all nodes are identified by index
    // dfs on the graph, get order

    if (adjacencyList.length != numNodes) {
        throw Error("");
    }    


    const status = []; // visit status of each node. 0: not visited, -1: being explored its descendants, 1: its tree visited
 
    for (let i = 0; i < numNodes; i++) {
        status.push(0);
    }

    // run dfs
    const ordering = []; // append from the start
    
    for (let i = 0; i < numNodes; i++) {
        if (status[i] === 0) {
            const isAcyclic = dfs(i,  adjacencyList, status, ordering);
            if (!isAcyclic) { // cycle detected
                return [];
            }
        }
    }
    return ordering;
}

// const newUserBlock = document.querySelector("header form > p:first-child");
// const buddyBlock = document.querySelector("header form > p:last-child");
// const addNewUser = newUserBlock.querySelector("button");
// const forgetBuddy = buddyBlock.querySelector("button");

// const usernameInput = document.querySelector("#uname");

// const h1 = document.querySelector("h1");


// DISPLAY USERNAME

// function greetingDisplay() {
//     if (localStorage.getItem("username")) {
//         // change template to display greeting
//         const username  = localStorage.getItem("username");

//         h1.textContent = `Welcome to your Chore Buddy, ${username}`;

//         buddyBlock.style.display = "block";
//         newUserBlock.style.display = "none";
//     } else {
//         h1.textContent = "Welcome to Chore Buddy";

//         buddyBlock.style.display = "none";
//         newUserBlock.style.display = "block";
//     }
// }

// addNewUser.addEventListener("click", (event) => {
//     event.preventDefault();
//     localStorage.setItem("username", usernameInput.value);
//     usernameInput.value = "";
//     greetingDisplay();
// })

// forgetBuddy.addEventListener("click", (event) => {
//     event.preventDefault();
//     localStorage.removeItem("username");
//     greetingDisplay();
// })

// greetingDisplay();