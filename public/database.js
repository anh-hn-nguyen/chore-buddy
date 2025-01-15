function initIndexedDb() {
  let db;
  return new Promise((resolve, reject) => {
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
      });

      // define schema of the object store
      choresObjectStore.createIndex("name", "name", { unique: true });
      choresObjectStore.createIndex("description", "description", { unique: false });

      // create relationship object store
      const connsObjectStore = db.createObjectStore("connections_os", {
        keyPath: ["parent", "child"],
      });

      // define schema for relation object store
      connsObjectStore.createIndex("parent", "parent", { unique: false });
      connsObjectStore.createIndex("child", "child", { unique: false });

      console.log("Database setup complete");
    });

    openRequest.addEventListener("success", (event) => {
      console.log("Success openning database");

      // store the openned db to variable
      resolve(openRequest.result);
    });

    openRequest.addEventListener("error", (event) => {
      console.error("Failed to open database");
      reject("Success openning database");
    });
  });
}

class ClientDb {
  db;

  constructor(db) {
    this.db = db;
  }

  getChores() {
    return new Promise((resolve, reject) => {
      const chores = {};

      const transaction = this.db.transaction(["chores_os"], "readonly");

      const choresObjectStore = transaction.objectStore("chores_os");

      // start a request to read chores
      const choresReadRequest = choresObjectStore.openCursor();

      choresReadRequest.addEventListener("success", (event) => {
        const cursor = event.target.result;

        if (cursor) {
          const chore = cursor.value;
          chores[chore.id.toString()] = chore;
          cursor.continue();
        } else {
          resolve(chores);
        }
      });
    });
  }

  getConnections() {
    return new Promise((resolve, reject) => {
      const conns = {};
      const transaction = this.db.transaction(["connections_os"], "readonly");
      const connsObjectStore = transaction.objectStore("connections_os");
      const connsReadRequest = connsObjectStore.openCursor();
      connsReadRequest.addEventListener("success", (event) => {
        const cursor = event.target.result;

        if (cursor) {
          const conn = cursor.value;
          const parent = conn.parent.toString();
          const child = conn.child.toString();

          if (!Object.hasOwn(conns, parent)) {
            conns[parent] = [];
          }
          conns[parent].push(child);
          cursor.continue();
        } else {
          resolve(conns);
        }
      });
    });
  }
  getChore(choreId) {
    choreId = Number(choreId);
    return new Promise((resolve, reject) => {
      // save to db
      const transaction = this.db.transaction(
        ["chores_os", "connections_os"],
        "readwrite"
      );
      const choresObjectStore = transaction.objectStore("chores_os");

      const readRequest = choresObjectStore.get(choreId);
      readRequest.addEventListener("success", (event) => {
        resolve(event.target.result);
      })
    })
  }

  addChore(newChore) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        ["chores_os", "connections_os"],
        "readwrite"
      );

      const choresObjectStore = transaction.objectStore("chores_os"); // get the object store of this transaction

      const addRequest = choresObjectStore.add(newChore); // carry out transaction

      addRequest.addEventListener("success", (event) => {
        const choreId = event.target.result.toString();
        resolve(choreId);
      });
    });
  }

  addConnection(parentId, childId) {
    parentId = Number(parentId);
    childId = Number(childId);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        ["chores_os", "connections_os"],
        "readwrite"
      );
      const connsObjectStore = transaction.objectStore("connections_os");
      const addRequest = connsObjectStore.add({
        parent: parentId,
        child: childId,
      });

      addRequest.addEventListener("success", (event) => {
        resolve(event.target.result);
      });
    });
  }

  deleteChore(choreId) {
    choreId = Number(choreId);
    return new Promise((resolve, reject) => {
      let targetChoreChildren = [];
      let targetChoreParents = [];

      // create transaction to read chore and its edges
      const readTransaction = this.db.transaction(
        ["chores_os", "connections_os"],
        "readonly"
      );

      // read the chore children
      const connsObjectStore = readTransaction.objectStore("connections_os");
      const parentIndex = connsObjectStore.index("parent");
      const childrenReadRequest = parentIndex.getAll(choreId);

      childrenReadRequest.addEventListener("success", (event) => {
        const conns = event.target.result;
        for (const conn of conns) {
          targetChoreChildren.push(conn.child);
        }
      });

      // read the chore parents
      const childIndex = connsObjectStore.index("child");
      const parentsReadRequest = childIndex.getAll(choreId);

      parentsReadRequest.addEventListener("success", (event) => {
        const conns = event.target.result;
        for (const conn of conns) {
          targetChoreParents.push(conn.parent);
        }
      });

      // delete transaction
      readTransaction.addEventListener("complete", (event) => {
        const deleteTransaction = this.db.transaction(
          ["chores_os", "connections_os"],
          "readwrite"
        );

        // delete chore
        const choresObjectStore = deleteTransaction.objectStore("chores_os");
        choresObjectStore.delete(choreId);

        const connsObjectStore =
          deleteTransaction.objectStore("connections_os");
        // delete chore children
        for (const childKey of targetChoreChildren) {
          connsObjectStore.delete([choreId, childKey]);
        }

        // delete chore parents
        for (const parentKey of targetChoreParents) {
          connsObjectStore.delete([parentKey, choreId]);
        }

        deleteTransaction.addEventListener("complete", () => {
          resolve();
        });

        deleteTransaction.addEventListener("error", (error) => {
          reject(error);
        });
      });
    });
  }

  deleteConnection(parentId, childId) {
    parentId = Number(parentId);
    childId = Number(childId);
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["connections_os"], "readwrite");
      const connectionsObjectStore = transaction.objectStore("connections_os");

      const deleteRequest = connectionsObjectStore.delete([parentId, childId]);

      deleteRequest.addEventListener("complete", () => resolve("Success"));

    })
  }

  updateChore(choreId, updatedChore) {
    choreId = Number(choreId);
    return new Promise((resolve, reject) => {
      // save to db
      const transaction = this.db.transaction(["chores_os"], "readwrite");
      const choresObjectStore = transaction.objectStore("chores_os");

      const readRequest = choresObjectStore.get(choreId);

      readRequest.addEventListener("success", (e) => {
          const item = e.target.result;
          item.name = updatedChore.name;
          item.description = updatedChore.description;

          choresObjectStore.put(item);

      })

      transaction.addEventListener("complete", (event) => {
        resolve(event.target.result);
      })
    })
  }

  getChildren(choreId) {
    choreId = Number(choreId);
    return new Promise((resolve, reject) => {
      const children = [];
      // create transaction to read chore and its edges
      const readTransaction = this.db.transaction(
        ["chores_os", "connections_os"],
        "readonly"
      );

      // read the chore children
      const connsObjectStore = readTransaction.objectStore("connections_os");
      const parentIndex = connsObjectStore.index("parent");
      const childrenReadRequest = parentIndex.getAll(choreId);

      childrenReadRequest.addEventListener("success", (event) => {
        const conns = event.target.result;
        for (const conn of conns) {
          children.push(conn.child.toString());
        }
        resolve(children);
      });

    })

  }

  getParents(choreId) {
    choreId = Number(choreId);
    return new Promise((resolve, reject) => {
      const parents = [];
      // read the chore parents
      const readTransaction = this.db.transaction(
        ["chores_os", "connections_os"],
        "readonly"
      );
      const connsObjectStore = readTransaction.objectStore("connections_os");
      const childIndex = connsObjectStore.index("child");
      const parentsReadRequest = childIndex.getAll(choreId);

      parentsReadRequest.addEventListener("success", (event) => {
        const conns = event.target.result;
        for (const conn of conns) {
          parents.push(conn.parent.toString());
        }
        resolve(parents);
      });
    })
  }


  
}

class ServerDb {
  token;
  baseUrl;
  constructor(token) {
    this.token = token;
    this.baseUrl = window.location.origin;
  }

  getChores() {
    return new Promise((resolve, reject) => {
      const headers = { "Authorization" : this.token };
      fetch(`${this.baseUrl}/chores`, { headers })
        .then((result) => result.json())
        .then((json) => {
          const items = json.items;
          // map array of items to map {id: item}
          const chores = {};
          for (const item of items) {
            // item.id = item._id;
            chores[item._id] = item;
          }
          resolve(chores);
        })
    })
  }

  getConnections() {
    return new Promise((resolve, reject) => {
      const headers = { "Authorization": this.token };
      fetch(`${this.baseUrl}/relationships`, { headers })
        .then((result) => result.json())  
        .then((result) => {
          const items = result.items;
          const connections = {};
          for (const item of items) {
            const parent = item.parent;
            const child = item.child;

            if (!Object.hasOwn(connections, parent)) {
              connections[parent] = [];
            }
            connections[parent].push(child);
          }
          resolve(connections);
        })
    })
  }

  getChore(choreId) {
    choreId = choreId;
    return new Promise((resolve, reject) => {
      const headers = { "Authorization": this.token };
      fetch(`${this.baseUrl}/chores/${choreId}`, { headers })
      .then((res) => res.json())
      .then((item) => {
        resolve(item);
      })
    })

  }

  addChore(newChore) {
    return new Promise((resolve, reject) => {
      const headers = { 
        "Authorization": this.token,
        "Content-Type": "application/json"
      };
      fetch(`${this.baseUrl}/chores`, {
        headers: headers,
        method: 'POST',
        body: JSON.stringify(newChore)
      })
        .then((res) => res.json())
        .then((jsonBody) => resolve(jsonBody.id));
    })
  }

  addConnection(parentId, childId) {
    parentId = parentId;
    childId = childId;
    
    return new Promise((resolve, reject) => {
      const headers = { 
        "Authorization": this.token,
        "Content-Type": "application/json"
      };
      fetch(`${this.baseUrl}/relationships`, {
        headers: headers,
        method: 'POST',
        body: JSON.stringify({
          parent: parentId,
          child: childId
        })
      })
        .then((res) => res.json())
        .then((jsonBody) => resolve(jsonBody.id));
    })

  }

  deleteChore(choreId) {
    return new Promise((resolve, reject) => {
      const headers = { "Authorization": this.token };
      fetch(`${this.baseUrl}/chores/${choreId}`, {
        headers: headers,
        method: 'DELETE'
      })
        .then(() => resolve())
    })
  }


  deleteConnection(parentId, childId) {
    return new Promise((resolve, reject) => {
      const headers = { "Authorization": this.token };
      fetch(`${this.baseUrl}/relationships/parents/${parentId}/children/${childId}`, {
        headers: headers,
        method: 'DELETE'
      })
        .then(() => resolve())
    })  
  }

  updateChore(choreId, updatedChore) {
    return new Promise((resolve, reject) => {
      const headers = { 
        "Authorization": this.token,
        "Content-Type": "application/json"
      };
      fetch(`${this.baseUrl}/chores/${choreId}`, {
        headers: headers,
        method: 'PUT',
        body: JSON.stringify(updatedChore)
      })
        .then(() => resolve());
    })
  }

  getChildren(choreId) {
    return new Promise((resolve, reject) => {
      const headers = { "Authorization": this.token };
      fetch(`${this.baseUrl}/relationships/parents/${choreId}`, {
        headers: headers,
      })
        .then((res) => res.json())
        .then((json) => {
          const children = [];
          const conns = json.items;
          for (const conn of conns) {
            children.push(conn.child);
          }
          resolve(children);
        });
    })
  }

  getParents(choreId) {
    return new Promise((resolve, reject) => {
      const headers = { "Authorization": this.token };
      fetch(`${this.baseUrl}/relationships/children/${choreId}`, {
        headers: headers,
      })
        .then((res) => res.json())
        .then((json) => {
          const parents = [];
          const conns = json.items;
          for (const conn of conns) {
            parents.push(conn.parent);
          }
          resolve(parents);
        });
    })
  }
}

export { ServerDb, ClientDb, initIndexedDb };