"use strict";

import { Memento } from "vscode";

let localStorage: Memento;

/**
 * Function to initialize this module, called in extension.ts
 * @param storage
 */
export function initializeLocalStorage(storage: Memento): void {
  localStorage = storage;
}

/**
 * Get a key from the local storage
 * @param key the key we wants
 * @returns the value associated with the key
 */
export function getFromLocalStorage(key: string): string | undefined {
  return localStorage.get(key);
}

/**
 * Set the key/value pair in the Memento API
 * @param key the key we want to retriece
 * @param value the value we want to set for that key
 */
export function setToLocalStorage(key: string, value: string): void {
  localStorage.update(key, value);
}
