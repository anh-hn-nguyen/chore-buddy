const choreNameInput = document.querySelector("#choreName");
const choreDescInput = document.querySelector("#choreDesc");
const choresChildrenSelect = document.querySelector("#choresChildrenSelect");
const addChoreBtn = document.querySelector("#addChore");

const choresList = document.querySelector("main section ul");
const sortChoresBtn = document.querySelector("#sortChores");
const refreshBtn = document.querySelector("#refresh");
const choresListStatusPara = document.querySelector("#choreListStatus")

let db;

// items can be deleted, index can change
let cyclicPair = [];

// open database chores
const openRequest = window.indexedDB.open("chores_db", 1);

// in case the db has not been set up or different version, run this handler
openRequest.addEventListener("upgradeneeded", (event) => {
    // set up the object store for chores
    db = event.target.result;

    // create object store
    const choresObjectStore = db.createObjectStore("chores_os", {
        keyPath: "id",
        autoIncrement: true, // the value is genereated and stored in prop keyPath => used to identify the object
    })

    // define schema of the object store
    choresObjectStore.createIndex("name", "name", { unique: true });
    choresObjectStore.createIndex("desc", "desc", { unique: false });
    
    // create relationship object store
    const connsObjectStore = db.createObjectStore("connections_os", {
        keyPath: ["parent", "child"],
    })

    // define schema for relation object store
    connsObjectStore.createIndex("parent", "parent", { unique: false });
    connsObjectStore.createIndex("child", "child", { unique: false });

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
})


sortChoresBtn.addEventListener("click", (event) => {
    event.preventDefault();
    choresListStatusPara.textContent = "";

    // read chores and connections
    const chores = {};
    const conns = {};

    // create a new transaction to read
    const transaction = db.transaction(["chores_os", "connections_os"], "readonly");

    const choresObjectStore = transaction.objectStore("chores_os");

    // start a request to read chores
    const choresReadRequest = choresObjectStore.openCursor();

    choresReadRequest.addEventListener("success", (event) => {
        const cursor = event.target.result;

        if (cursor) {
            const chore = cursor.value;
            chores[chore.id] = chore;
            cursor.continue();
        }

    })

    // start a read request to read connections
    const connsObjectStore = transaction.objectStore("connections_os");
    const connsReadRequest = connsObjectStore.openCursor();
    connsReadRequest.addEventListener("success", (event) => {
        const cursor = event.target.result;

        if (cursor) {
            const conn = cursor.value;
            const parent = conn.parent;
            const child = conn.child;

            if (!Object.hasOwn(conns, parent)) {
                conns[parent] = [];
            }
            conns[parent].push(child);
            cursor.continue();
        }
    })

    transaction.addEventListener("complete", (event) => {
        for (const choreId in chores) {
            if (!Object.hasOwn(conns, choreId)) {
                conns[choreId] = [];
            }
        }

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

    })

})

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
})


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


    // add to the index db
    // start a new transaction with the db to add
    const transaction = db.transaction(["chores_os", "connections_os"], "readwrite");

    const choresObjectStore = transaction.objectStore("chores_os"); // get the object store of this transaction

    const addRequest = choresObjectStore.add(newChore); // carry out transaction

    addRequest.addEventListener("success", (event) => {
        const parentId = event.target.result;
        
        const connsObjectStore = transaction.objectStore("connections_os");
        for (const childKey of children) {
            connsObjectStore.add({
                parent: parentId,
                child: childKey
            });
        }

        // clear inputs
        choreNameInput.value = "";
        choreDescInput.value = "";
        choresChildrenSelect.value = "";
    });

    // report transaction results
    transaction.addEventListener("complete", (event) => {
        readAndDisplayAllChores();
    });

    transaction.addEventListener("error", (event) => {
        console.log("Transaction not opened due to error");
    })


});


function readAndDisplayAllChores() {
    const chores = {};
    const conns = {};

    // create a new transaction to read
    const transaction = db.transaction(["chores_os", "connections_os"], "readonly");


    const choresObjectStore = transaction.objectStore("chores_os");

    // start a request to read chores
    const choresReadRequest = choresObjectStore.openCursor();

    choresReadRequest.addEventListener("success", (event) => {
        const cursor = event.target.result;

        if (cursor) {
            const chore = cursor.value;
            chores[chore.id] = chore;
            cursor.continue();
        }
    })

    // start a read request to read connections
    const connsObjectStore = transaction.objectStore("connections_os");
    const connsReadRequest = connsObjectStore.openCursor();
    connsReadRequest.addEventListener("success", (event) => {
        const cursor = event.target.result;
        
        if (cursor) {
            const conn = cursor.value;
            const parent = conn.parent;
            const child = conn.child;
            if (!Object.hasOwn(conns, parent)) {
                conns[parent] = [];
            }
            conns[parent].push(child);
            cursor.continue();
        }
    })


    transaction.addEventListener("complete", (event) => {
        for (const choreId in chores) {
            if (!Object.hasOwn(conns, choreId)) {
                conns[choreId] = [];
            }
        }
        displayData(chores, conns);
        updateSelectOptions(chores); // in "Add Chore" form
    })

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

    choresChildrenSelect.size = Math.max(1, Math.min(3, Object.keys(chores).length));
}

function displaySortSuccess(chores) {
    if (Object.keys(chores).length === 0) {
        choresListStatusPara.textContent = "Oh! It looks like your chore list is empty!";
    } else {
        choresListStatusPara.textContent = "Yay! All your chores are sorted!";
    }
    choresListStatusPara.setAttribute("class", "success");
}

function displayNonSortSuccess(chores) {
    choresListStatusPara.textContent = "";
    if (Object.keys(chores).length === 0) {
        choresListStatusPara.textContent = "Your chore list is empty! Ready to add some new tasks?";
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
        const childrenKeys = conns[choreId];
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
    const choreKey = Number(event.target.parentNode.parentNode.getAttribute("data-item-id"));

    let targetChoreChildren = [];
    let targetChoreParents = [];

    // create transaction to read chore and its edges
    const readTransaction = db.transaction(["chores_os", "connections_os"], "readonly");

    // read the chore children
    const connsObjectStore = readTransaction.objectStore("connections_os");
    const parentIndex = connsObjectStore.index("parent");
    const childrenReadRequest = parentIndex.getAll(choreKey);

    childrenReadRequest.addEventListener("success", (event) => {
        const conns = event.target.result;
        for (const conn of conns) {
            targetChoreChildren.push(conn.child);
        }
    })

    // read the chore parents
    const childIndex = connsObjectStore.index("child");
    const parentsReadRequest = childIndex.getAll(choreKey);

    parentsReadRequest.addEventListener("success", (event) => {
        const conns = event.target.result;
        for (const conn of conns) {
            targetChoreParents.push(conn.parent);
        }
    })


    // delete transaction
    readTransaction.addEventListener("complete", (event) => {
        const deleteTransaction = db.transaction(["chores_os", "connections_os"], "readwrite");

        // delete chore
        const choresObjectStore = deleteTransaction.objectStore("chores_os");
        choresObjectStore.delete(choreKey);

        const connsObjectStore = deleteTransaction.objectStore("connections_os");
        // delete chore children
        for (const childKey of targetChoreChildren) {
            connsObjectStore.delete([choreKey, childKey]);
        }

        // delete chore parents
        for (const parentKey of targetChoreParents) {
            connsObjectStore.delete([parentKey, choreKey]);
        }

        deleteTransaction.addEventListener("complete", () => {
            readAndDisplayAllChores();
        });
    
        deleteTransaction.addEventListener("error", (error) => {
            console.error(error);
        })

    })


}

function updateItem(event) {
    event.preventDefault();

    const target = event.target;

    // parent node = list item
    const choreListItem = target.parentNode.parentNode;
    const targetChoreId = Number(choreListItem.getAttribute("data-item-id"));
    
    // get this item from index map

    // read this chore and its connections from db
    let targetChore = null;
    let targetChoreChildren = [];
    const chores = {};

    const transaction = db.transaction(["chores_os", "connections_os"], "readonly");
    const choresObjectStore = transaction.objectStore("chores_os");

    // start a request to read chores
    const choresReadRequest = choresObjectStore.openCursor();

    choresReadRequest.addEventListener("success", (event) => {
        const cursor = event.target.result;

        if (cursor) {
            const chore = cursor.value;
            chores[chore.id] = chore;
            cursor.continue();
        }

    })

    // read the chore
    const choreReadRequest = choresObjectStore.get(targetChoreId);
    choreReadRequest.addEventListener("success", (event) => {
        targetChore = event.target.result;
    })

    // read the chore children
    const connsObjectStore = transaction.objectStore("connections_os");
    const index = connsObjectStore.index("parent");
    const childrenReadRequest = index.getAll(targetChoreId);

    childrenReadRequest.addEventListener("success", (event) => {
        const conns = event.target.result;
        for (const conn of conns) {
            targetChoreChildren.push(conn.child);
        }
        
    })

    // display update form
    transaction.addEventListener("complete", (event) => {
        // change the item to form
        const formElem = document.createElement("form");

        const div  = document.createElement("div");

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
            saveUpdate(event, targetChore, targetChoreChildren);
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
            const deletedChild = choreListItem.removeChild(choreListItem.firstChild);
            deletedChildren.push(deletedChild);
        }

        choreListItem.appendChild(formElem);

    })
}

function saveUpdate(event, targetChore, targetChoreChildren) {
    const target = event.target; // button
    const form = target.parentNode.parentNode;

    const updateNameInput = document.querySelector("#newName");
    const updateDescInput = document.querySelector("#newDesc");
    const updateChildrenSelect = document.querySelector("#newChildren");
    const targetChoreId = Number(form.parentNode.getAttribute("data-item-id"));


    updateNameInput.setCustomValidity("");

    if (!updateNameInput.validity.valid) {
        return;
    }

    const newName = updateNameInput.value.trim();
    event.preventDefault();
   

    // save to db
    const transaction = db.transaction(["chores_os", "connections_os"], "readwrite");
    const choresObjectStore = transaction.objectStore("chores_os");

    const readRequest = choresObjectStore.get(targetChoreId);

    readRequest.addEventListener("success", (e) => {
        const item = e.target.result;
        item.name = newName;
        item.desc = updateDescInput.value;

        choresObjectStore.put(item);

    })

    const connsObjectStore = transaction.objectStore("connections_os");
    for (const option of updateChildrenSelect.children) {
        const childChoreId = Number(option.value);
        if (option.selected) {
            // add if not existed
            if (!targetChoreChildren.includes(childChoreId)) {
                const item = {
                    parent: targetChoreId,
                    child: childChoreId
                }
                connsObjectStore.add(item);
            }
 
        } else {
            // remove this edge if exist
            if (targetChoreChildren.includes(childChoreId)) {
                connsObjectStore.delete([targetChoreId, childChoreId]);
            }

        }
    }

    transaction.addEventListener("complete", (event) => {
        readAndDisplayAllChores();
    })
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
            isAcyclic = dfs(child, connections, status, ordering);
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
    }

    // run dfs
    const ordering = []; // append from the start
    
    for (const choreId in chores) {
        if (status[choreId] === 0) {
            const isAcyclic = dfs(choreId,  connections, status, ordering);
            if (!isAcyclic) { // cycle detected
                return [];
            }
        }
    }
    return ordering;
}