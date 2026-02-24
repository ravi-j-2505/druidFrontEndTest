// const DB_NAME = 'MyAppDB';
// const STORE_NAME = 'KeyValueStore';
// const DB_VERSION = 1;

// function openDB(): Promise<IDBDatabase> {
//   return new Promise((resolve, reject) => {
//     const request = indexedDB.open(DB_NAME, DB_VERSION);

//     request.onupgradeneeded = (event) => {
//       const db = (event.target as IDBOpenDBRequest).result;
//       if (!db.objectStoreNames.contains(STORE_NAME)) {
//         db.createObjectStore(STORE_NAME);
//       }
//     };

//     request.onsuccess = () => resolve(request.result);
//     request.onerror = () => reject(request.error);
//   });
// }

// const IndexedDB = {
//   async setItem<T = unknown>(key: string, value: T): Promise<void> {
//     const db = await openDB();
//     return new Promise((resolve, reject) => {
//       const tx = db.transaction(STORE_NAME, 'readwrite');
//       const store = tx.objectStore(STORE_NAME);
//       const request = store.put(value, key);
//       request.onsuccess = () => resolve();
//       request.onerror = () => reject(request.error);
//     });
//   },

//   async getItem<T = unknown>(key: string): Promise<T | null> {
//     const db = await openDB();
//     return new Promise((resolve, reject) => {
//       const tx = db.transaction(STORE_NAME, 'readonly');
//       const store = tx.objectStore(STORE_NAME);
//       const request = store.get(key);
//       request.onsuccess = () => resolve(request.result ?? null);
//       request.onerror = () => reject(request.error);
//     });
//   },

//   async removeItem(key: string): Promise<void> {
//     const db = await openDB();
//     return new Promise((resolve, reject) => {
//       const tx = db.transaction(STORE_NAME, 'readwrite');
//       const store = tx.objectStore(STORE_NAME);
//       const request = store.delete(key);
//       request.onsuccess = () => resolve();
//       request.onerror = () => reject(request.error);
//     });
//   },

//   async clear(): Promise<void> {
//     const db = await openDB();
//     return new Promise((resolve, reject) => {
//       const tx = db.transaction(STORE_NAME, 'readwrite');
//       const store = tx.objectStore(STORE_NAME);
//       const request = store.clear();
//       request.onsuccess = () => resolve();
//       request.onerror = () => reject(request.error);
//     });
//   },
// };

// export default IndexedDB;



const DB_NAME = 'MyAppDB';
const DB_VERSION = 2; // Incremented to force schema update for document_id keyPath

function openDB(tables: string[]): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            for (const table of tables) {
                // Delete existing object store if it exists (for schema migration)
                if (db.objectStoreNames.contains(table)) {
                    db.deleteObjectStore(table);
                }
                // Create new object store with document_id as key path
                db.createObjectStore(table, { keyPath: 'document_id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}


const IndexedDB = {
    async insert<T = any>(table: string, value: T): Promise<IDBValidKey> {
        const db = await openDB([table]);
        return new Promise((resolve, reject) => {
            const tx = db.transaction(table, 'readwrite');
            const store = tx.objectStore(table);
            
            // For NoSQL-style documents, we use the document_id as the key
            // Remove the problematic id field that's set to 0
            const valueToInsert = { ...value } as any;
            if (valueToInsert.id === 0 || valueToInsert.id === undefined) {
                delete valueToInsert.id;
            }
            
            // Ensure document_id exists for the key
            if (!valueToInsert.document_id) {
                reject(new Error('document_id is required for NoSQL documents'));
                return;
            }
            
            const request = store.add(valueToInsert);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getAll<T = any>(table: string): Promise<T[]> {
        const db = await openDB([table]);
        return new Promise((resolve, reject) => {
            const tx = db.transaction(table, 'readonly');
            const store = tx.objectStore(table);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    async getById<T = any>(table: string, id: IDBValidKey): Promise<T | null> {
        const db = await openDB([table]);
        return new Promise((resolve, reject) => {
            const tx = db.transaction(table, 'readonly');
            const store = tx.objectStore(table);
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result ?? null);
            request.onerror = () => reject(request.error);
        });
    },

    async deleteById(table: string, id: IDBValidKey): Promise<void> {
        const db = await openDB([table]);
        return new Promise((resolve, reject) => {
            const tx = db.transaction(table, 'readwrite');
            const store = tx.objectStore(table);
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async truncate(table: string): Promise<void> {
        const db = await openDB([table]);
        return new Promise((resolve, reject) => {
            const tx = db.transaction(table, 'readwrite');
            const store = tx.objectStore(table);
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },

    async updateById<T = any>(table: string, id: IDBValidKey, value: Partial<T>): Promise<void> {
        const db = await openDB([table]);
        return new Promise((resolve, reject) => {
            const tx = db.transaction(table, 'readwrite');
            const store = tx.objectStore(table);
            const getRequest = store.get(id);

            getRequest.onsuccess = () => {
                const existingRecord = getRequest.result;
                if (existingRecord) {
                    const updatedRecord = { ...existingRecord, ...value };
                    const updateRequest = store.put(updatedRecord);
                    updateRequest.onsuccess = () => resolve();
                    updateRequest.onerror = () => reject(updateRequest.error);
                } else {
                    reject(new Error('Record not found'));
                }
            };

            getRequest.onerror = () => reject(getRequest.error);
        });
    },

    async upsert<T = any>(table: string, value: T, uniqueField?: string): Promise<IDBValidKey> {
        const db = await openDB([table]);
        return new Promise((resolve, reject) => {
            const tx = db.transaction(table, 'readwrite');
            const store = tx.objectStore(table);
            
            // Create a copy of the value and remove problematic id field
            const valueToUpsert = { ...value } as any;
            if (valueToUpsert.id === 0 || valueToUpsert.id === undefined) {
                delete valueToUpsert.id;
            }
            
            // Ensure document_id exists for the key
            if (!valueToUpsert.document_id) {
                reject(new Error('document_id is required for NoSQL documents'));
                return;
            }
            
            // For NoSQL documents, we can directly use put() since document_id is the key
            // put() will either insert or update based on the key
            const putRequest = store.put(valueToUpsert);
            putRequest.onsuccess = () => resolve(putRequest.result);
            putRequest.onerror = () => reject(putRequest.error);
        });
    }
};

export default IndexedDB;
