const choreNameInput = document.querySelector("#choreName");
const choreDescInput = document.querySelector("#choreDesc");
const parentsSelect = document.querySelector("#choresParentSelect");
const addChoreBtn = document.querySelector("#addChore");

const choresWrapper = document.querySelector("main section ul");
const sortChoresBtn = document.querySelector("#sortChores");



// items can be deleted, index can change
const chores = [
    {
        key: 1,
        name: "Laundry",
        desc: "Laundry",
        parents: [2] // do laundry after pick up Judy
    },
    {
        key: 2,
        name: "Pick up Judy",
        desc: "Teacher notes class finishes early",
        parents: []
    }
];



sortChoresBtn.addEventListener("click", (event) => {
    event.preventDefault();

    const sortedChores = sortItems();

    displayData(sortedChores);
})


addChoreBtn.addEventListener("click", (event) => {
    event.preventDefault();

    const parents = [];
    for (const option of parentsSelect.children) {
        if (option.selected) {
            parents.push(Number(option.value));
        }
    }

    const newChore = {
        name: choreNameInput.value,
        desc: choreDescInput.value,
        parents: parents
    };

    console.log(newChore);

    chores.push(newChore);

    displayData(chores);

    // clear inputs
    choreNameInput.value = "";
    choreDescInput.value = "";
    parentsSelect.value = "";

    choreNameInput.focus();


});

function displaySelectOptions() {
    for (const chore of chores) {
        const option = document.createElement("option");

        option.textContent = chore.name;
        option.value = chore.key;
        option.name = parentsSelect.name;
        parentsSelect.appendChild(option);
    }

    parentsSelect.size = Math.min(3, chores.length);
}

function displayData(chores) {
    while (choresWrapper.firstChild) {
        choresWrapper.removeChild(choresWrapper.firstChild);
    }
    const indexMap = createIndexMap(chores); // map key of each object (chore) to its current index in the list, so later an parent object can be retrieved by the key
    
    for (const item of chores) {
        displayItem(item, chores, indexMap);
    }

}

function displayItem(chore, chores, indexMap) {
    const li = document.createElement("li");

    const h3 = document.createElement("h3");
    h3.textContent = chore.name;

    const para = document.createElement("p");
    para.textContent = chore.desc;

    // display parents
    const parentsPara = document.createElement("p");
    parentsPara.textContent = "This must be completed after:";

    const parentsListWrapper = document.createElement("ul");
    for (const parentKey of chore.parents) {
        const parent = chores[indexMap[parentKey]];
        const li = document.createElement("li");
        li.textContent = parent.name;
        parentsListWrapper.appendChild(li);
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "submit";
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", deleteItem);

    li.appendChild(h3);
    li.appendChild(para);
    if (chore.parents.length > 0) {
        li.appendChild(parentsPara);
        li.appendChild(parentsListWrapper);
    }

    // li.appendChild(deleteBtn);

    choresWrapper.appendChild(li);

}

function deleteItem() {
    choresWrapper.removeChild(this.parentNode);
}


function createIndexMap(chores) {
    const indexMap = {}; // map item key to index in chores
    const n = chores.length;

    for (let i = 0; i < n; i++) {
        indexMap[chores[i].key] = i;
    }
    return indexMap;
}

function sortItems() {
    // map item keys to index
    // create list of parents
    const indexMap = createIndexMap(chores);
    const n = chores.length;

    const parentsList = [];
    for (let i = 0; i < n; i++) {
        const parentKeys = chores[i].parents;
        parentsList.push([]);

        for (const parentKey of parentKeys) {
            parentsList[i].push(indexMap[parentKey]);
        }
    }
    
    const order = ordering(n, parentsList);

    const sortedChores = [];
    for (const index of order) {
        sortedChores.push(chores[index]);
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

function ordering(numNodes, parentsList) {
    // all nodes are identified by index
    // parents: list of list. parents[i] = parents of i
    // build adjacency list
    // dfs on the graph, get order

    if (parentsList.length != numNodes) {
        throw Error("");
    }    

    // adjacency list
    // adjacencyList[i] = chidren of i
    const adjacencyList = [];

    const status = []; // visit status of each node. 0: not visited, -1: being explored its descendants, 1: its tree visited
 
    for (let i = 0; i < numNodes; i++) {
        adjacencyList.push([]);
        status.push(0);
    }

    for (let i = 0; i < numNodes; i++) {
        const parents = parentsList[i];

        for (const parent of parents) {
            adjacencyList[parent].push(i);
        }
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

displayData(chores);
displaySelectOptions();